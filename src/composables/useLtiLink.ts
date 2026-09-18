import { ltiApi } from '@/api/lti.api'

/**
 * The link challenge handed out by a refused Moodle launch.
 *
 * A launch whose Moodle identity is unknown, but whose e-mail address
 * already belongs to an account, is refused: the address comes from an
 * editable Moodle profile field and proves nothing about who is
 * launching. Instead of signing anybody in, the backend redirects here
 * with a short-lived challenge.
 *
 * Spending it requires a direct sign-in, which leaves the page and
 * comes back — so the challenge is kept in sessionStorage rather than
 * in memory. It is scoped to the tab, dies with it, and grants nothing
 * on its own: without the login behind it, the challenge is worthless.
 */
const STORAGE_KEY = 'lti_link_challenge'

export function useLtiLink() {
  function remember(challenge: string): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, challenge)
    } catch {
      // Private mode or blocked storage. The flow then only works
      // without leaving the page, which is the already-signed-in case.
    }
  }

  function pending(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  }

  function forget(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clean up.
    }
  }

  async function submit(challenge: string): Promise<void> {
    await ltiApi.link(challenge)
  }

  return { remember, pending, forget, submit }
}
