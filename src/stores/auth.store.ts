import { defineStore } from 'pinia'
import { AuthService } from '@/services/auth.service'
import { useKeycloak } from '@/composables/useKeycloak'
import { useLtiSession } from '@/composables/useLtiSession'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { invalidateAll as invalidateOpenStackCache } from '@/composables/useOpenStackResourceCache'
import type { User, UserRole } from '@/types'

const keycloak = useKeycloak()
const ltiSession = useLtiSession()

// In-flight promises to dedupe concurrent calls. The router guard,
// App mount, and view mounts can all trigger initialize/fetchMe at the
// same time on a cold load — without this, each call hits the backend
// (token validation, /users/me, credential fetch) once per trigger.
let initializePromise: Promise<void> | null = null
let fetchMePromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    // Either sign-in path counts. A tab launched from Moodle has no
    // Keycloak session at all and must not be sent to the login page.
    isAuthenticated: () => ltiSession.isActive() || keycloak.isAuthenticated.value,

    // Whether this tab is running as a Moodle-launched session. The
    // difference matters wherever the Keycloak path would redirect:
    // an LTI session cannot be renewed, only launched again.
    isLtiSession: () => ltiSession.isActive(),
    
    userRole: (state): UserRole | null => state.user?.role || null,
    
    isStudent: (state) => state.user?.role === 'student',
    isTeacher: (state) => state.user?.role === 'teacher',
    isAdmin: (state) => state.user?.role === 'admin',
    
    isTeacherOrAdmin: (state) => 
      state.user?.role === 'teacher' || state.user?.role === 'admin',
    
    userId: (state) => state.user?.userId || null,
  },

  actions: {
    async initialize() {
      if (initializePromise) return initializePromise
      initializePromise = (async () => {
        this.isLoading = true
        try {
          // A launched session already has its token; running the
          // Keycloak initialize here would look for an SSO session that
          // does not exist and clear the authenticated state.
          if (ltiSession.isActive()) {
            await this.fetchMe().catch(() => {})
            return
          }

          await keycloak.initialize()

          if (keycloak.isAuthenticated.value) {
            const storedUser = AuthService.getStoredUser()
            if (storedUser) {
              this.user = storedUser
            }

            // Fire-and-forget refresh of the stored user: ``fetchMe`` already
            // logs failures, and the stored user keeps the UI usable meanwhile.
            this.fetchMe().catch(() => {})
          }
        } catch (error) {
          // Deliberately silent for the user: the router guard treats a
          // failed init as "not authenticated" and redirects to login.
          console.error('Auth initialization failed:', error)
        } finally {
          this.isLoading = false
        }
      })()
      return initializePromise
    },

    async login(returnUrl?: string) {
      this.error = null
      try {
        await keycloak.login(returnUrl)
      } catch (err: any) {
        this.error = err.message || 'Login failed'
        throw err
      }
    },

    async handleCallback() {
      /**
       * Finalize the Authorization Code + PKCE flow.
       * Resolves return URL from Keycloak, then loads the current user from backend.
       */
      this.isLoading = true
      this.error = null
      
      try {
        const returnUrl = await keycloak.handleCallback()
        
        await this.fetchMe()
        
        return returnUrl
      } catch (err: any) {
        this.error = err.message || 'Callback handling failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async fetchMe() {
      if (fetchMePromise) return fetchMePromise
      fetchMePromise = (async () => {
        try {
          this.user = await AuthService.fetchMe()
          // Background prefetch; the credentials store records its own
          // error state, so nothing to handle here.
          useOpenStackCredentialsStore().fetch().catch(() => {})
        } catch (error) {
          console.error('Failed to fetch user:', error)
          this.user = null
          throw error
        } finally {
          fetchMePromise = null
        }
      })()
      return fetchMePromise
    },

    async logout() {
      AuthService.clearStoredUser()
      const wasLtiSession = ltiSession.isActive()
      ltiSession.clear()
      this.user = null
      this.error = null
      initializePromise = null
      fetchMePromise = null
      useOpenStackCredentialsStore().reset()
      // Clear the OpenStack resource display cache — the next user has their own
      // credentials and a different project, so old resource lists must not persist.
      invalidateOpenStackCache()

      // A launched session has no Keycloak session behind it; calling
      // signoutRedirect() would bounce the user to a logout page for a
      // session that was never established.
      if (wasLtiSession) return

      try {
        await keycloak.logout()
      } catch (error) {
        // Local session is already cleared above; a failed Keycloak
        // logout must not block the user, so only log it.
        console.error('Logout failed:', error)
      }
    },

    hasRole(role: UserRole): boolean {
      return this.user?.role === role
    },

    hasAnyRole(...roles: UserRole[]): boolean {
      if (!this.user?.role) return false
      return roles.includes(this.user.role as UserRole)
    },
  },
})
