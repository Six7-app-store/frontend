import { defineStore } from 'pinia'
import { credentialsApi } from '@/api/credentials.api'
import { getErrorDetailMessage, getErrorReason, getErrorStatus } from '@/utils/http-error'
import type {
  OpenStackCredentialFromYaml,
  OpenStackCredentialResponse,
  OpenStackCredentialUpsert,
} from '@/types/openstack-credential'

interface State {
  status: OpenStackCredentialResponse | null
  loading: boolean
  // The backend's own message of the last failure, if it sent one. Views
  // fall back to their translated text when this is null.
  error: string | null
}

const LOCKED_REASON = 'openstack_credentials_locked'

function isLockedError(err: unknown): boolean {
  return getErrorStatus(err) === 409 && getErrorReason(err) === LOCKED_REASON
}

// Dedupe concurrent fetch() calls — DashboardView mount, auth store
// post-login, and route guards can all kick this off at the same time
// on a cold load. Without this, each trigger hits the backend.
let fetchPromise: Promise<OpenStackCredentialResponse | null> | null = null

export const useOpenStackCredentialsStore = defineStore('openstack-credentials', {
  state: (): State => ({
    status: null,
    loading: false,
    error: null,
  }),

  getters: {
    hasCredential: (s) => !!s.status?.has_credential,
    isValidated: (s) =>
      !!s.status?.last_validated_at && !s.status?.last_validation_error,
    lastError: (s) => s.status?.last_validation_error || null,
    isLocked: (s) => !!s.status?.is_locked,
    activeDeployments: (s) => s.status?.active_deployments ?? 0,
    // True once the GET /me/openstack-credentials has resolved at least
    // once. Banners and disabled states should gate on this to avoid the
    // "fehlen" message flashing during the initial fetch.
    isResolved: (s) => s.status !== null,
  },

  actions: {
    async fetch() {
      if (fetchPromise) return fetchPromise
      fetchPromise = (async () => {
        this.loading = true
        this.error = null
        try {
          const res = await credentialsApi.get()
          this.status = res.data
          return res.data
        } catch (err) {
          this.error = getErrorDetailMessage(err) ?? null
          return null
        } finally {
          this.loading = false
          fetchPromise = null
        }
      })()
      return fetchPromise
    },

    async save(payload: OpenStackCredentialUpsert) {
      this.loading = true
      this.error = null
      try {
        const res = await credentialsApi.put(payload)
        this.status = res.data
        return res.data
      } catch (err) {
        this.error = getErrorDetailMessage(err) ?? null
        if (isLockedError(err)) await this.fetch()
        throw err
      } finally {
        this.loading = false
      }
    },

    async saveFromYaml(body: OpenStackCredentialFromYaml) {
      this.loading = true
      this.error = null
      try {
        const res = await credentialsApi.putFromYaml(body)
        this.status = res.data
        return res.data
      } catch (err) {
        this.error = getErrorDetailMessage(err) ?? null
        if (isLockedError(err)) await this.fetch()
        throw err
      } finally {
        this.loading = false
      }
    },

    async remove() {
      this.loading = true
      this.error = null
      try {
        await credentialsApi.remove()
        await this.fetch()
      } catch (err) {
        this.error = getErrorDetailMessage(err) ?? null
        if (isLockedError(err)) await this.fetch()
        throw err
      } finally {
        this.loading = false
      }
    },

    async test() {
      this.loading = true
      this.error = null
      try {
        const res = await credentialsApi.test()
        this.status = res.data
        return res.data
      } catch (err) {
        this.error = getErrorDetailMessage(err) ?? null
        throw err
      } finally {
        this.loading = false
      }
    },

    reset() {
      this.status = null
      this.error = null
      this.loading = false
    },
  },
})
