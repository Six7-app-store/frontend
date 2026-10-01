import { ltiApi } from '@/api/lti.api'

/**
 * Answering a Moodle deep-linking request. The backend signs the choice;
 * posting it back to Moodle is the page's job, because only the lecturer's
 * browser carries the Moodle session.
 */
export function useLtiDeepLink() {
  /** The signed answer for binding the activity to ``appId``; throws on failure. */
  async function select(handle: string, appId: string) {
    return (await ltiApi.selectDeepLink(handle, appId)).data
  }

  return { select }
}
