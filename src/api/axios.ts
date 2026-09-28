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

/**
 * ``Authorization`` header value for a request to ``url`` (relative to the
 * API base), or ``null`` when there is no token to send.
 *
 * Two sources: a Moodle-launched tab carries the backend's own LTI session
 * token, everything else uses Keycloak. The backend accepts both on the
 * same endpoints and tells them apart by the token's issuer. Exported for
 * the one request that cannot go through axios — the SSE stream — so it
 * picks the token the same way.
 */
export async function authorizationFor(url: string | undefined): Promise<string | null> {
  const ltiSession = useLtiSession()
  // Linking a Moodle account is the one call a launched session must
  // not make: the backend only accepts a direct login there, because
  // an LTI session is itself derived from the claim being checked.
  const needsDirectLogin = url === '/lti/link'

  if (ltiSession.isActive() && !needsDirectLogin) {
    return `Bearer ${ltiSession.getToken()}`
  }

  const token = await useKeycloak().getAccessToken()
  return token ? `Bearer ${token}` : null
}

/**
 * Reaction to a 401 from the backend, shared by axios and the SSE stream.
 */
export async function handleUnauthorized(): Promise<void> {
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
    return
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

api.interceptors.request.use(
  async (config) => {
    const authorization = await authorizationFor(config.url)
    if (authorization) {
      config.headers.Authorization = authorization
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Global error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await handleUnauthorized()
    }

    // 403: Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data)
    }

    return Promise.reject(error)
  }
)

export default api
