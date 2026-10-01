import axios, { type AxiosError } from 'axios'
import { useKeycloak } from '@/composables/useKeycloak'
import { useLtiSession } from '@/composables/useLtiSession'
import { env } from '@/env'

const api = axios.create({
  baseURL: env.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Bearer token added automatically. Two sources: a Moodle-launched tab
// carries the backend's own LTI session token, everything else uses
// Keycloak. The backend accepts both on the same endpoints and tells
// them apart by the token's issuer.
api.interceptors.request.use(
  async (config) => {
    const ltiSession = useLtiSession()
    // Linking a Moodle account is the one call a launched session must
    // not make: the backend only accepts a direct login there, because
    // an LTI session is itself derived from the claim being checked.
    const needsDirectLogin = config.url === '/lti/link'

    if (ltiSession.isActive() && !needsDirectLogin) {
      config.headers.Authorization = `Bearer ${ltiSession.getToken()}`
      return config
    }

    const keycloak = useKeycloak()
    const token = await keycloak.getAccessToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Global error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // 401: Not authenticated -> Try to refresh, then redirect to login
    if (error.response?.status === 401) {
      const ltiSession = useLtiSession()

      // A launched session cannot be renewed: there is no refresh token
      // and no Keycloak session behind it. Sending the user to the
      // Keycloak login here would drop them out of the Moodle context
      // into an account they may not even have. Drop the expired token
      // and let the app render its unauthenticated state instead — the
      // way back in is one click in Moodle.
      if (ltiSession.isActive()) {
        ltiSession.clear()
        window.location.assign('/lti/expired')
        return Promise.reject(error)
      }

      const keycloak = useKeycloak()

      // Try to ensure valid token (silent refresh)
      const hasValidToken = await keycloak.ensureValidToken()

      if (!hasValidToken) {
        // Clear any stored data
        localStorage.removeItem('user')
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          const returnUrl = window.location.pathname
          await keycloak.login(returnUrl)
        }
      }
    }
    
    // 403: Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data)
    }
    
    return Promise.reject(error)
  }
)

export default api
