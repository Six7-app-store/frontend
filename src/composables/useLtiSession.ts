import { ref, readonly } from 'vue'

/**
 * The session issued by the backend after a Moodle LTI launch.
 *
 * This is the second way into the app store. It exists because Keycloak
 * cannot carry a session that starts inside Moodle: the silent renew
 * runs through a hidden iframe, and a browser treats that as a third
 * party and blocks its cookies. The backend therefore issues its own
 * short-lived token at the end of the launch.
 *
 * Two consequences shape everything below:
 *
 * - **There is no refresh.** When the token expires the user launches
 *   again from Moodle. That is one click, and it re-checks course
 *   membership on the way through.
 * - **It lives in sessionStorage, not memory.** A launched session must
 *   survive a page reload, and unlike the Keycloak path there is no SSO
 *   cookie to silently re-issue one. sessionStorage is scoped to the
 *   tab and cleared when it closes, which matches the lifetime of a
 *   launch. It is no more exposed to XSS than the in-memory token is
 *   to a payload already running in the page, and the token is
 *   short-lived by design.
 */
const STORAGE_KEY = 'lti_session_token'

function readStored(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    // Private mode, blocked storage — treat as "no session".
    return null
  }
}

const token = ref<string | null>(readStored())

export function useLtiSession() {
  function setToken(value: string) {
    token.value = value
    try {
      sessionStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Keep the in-memory copy; the session then lasts until reload.
    }
  }

  function clear() {
    token.value = null
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to do — the in-memory copy is already gone.
    }
  }

  /** Whether this tab is running as a Moodle-launched session. */
  function isActive(): boolean {
    return !!token.value
  }

  function getToken(): string | null {
    return token.value
  }

  return {
    token: readonly(token),
    setToken,
    clear,
    isActive,
    getToken,
  }
}
