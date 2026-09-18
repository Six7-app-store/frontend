import api from './axios'

export interface LtiLinkResponse {
  status: 'linked' | 'already_linked'
}

/** A Moodle course a launch came from, and the course it maps to. */
export interface LtiContext {
  ltiContextId: string
  issuer: string
  context_id: string
  title: string | null
  label: string | null
  /** ``null`` until somebody who teaches the course says they belong
   *  together — a Moodle course and a Studiengruppe are not the same
   *  thing, so the backend never guesses this. */
  courseId: string | null
}

// ----------------------------------------------------------------
// LTI API
// ----------------------------------------------------------------
export const ltiApi = {
  /**
   * Claim the Moodle identity behind a refused launch.
   *
   * Needs a direct (Keycloak) sign-in: that is the half of the proof
   * the challenge cannot supply. The backend rejects the call when it
   * arrives on a launched session.
   */
  link: (challenge: string) => {
    return api.post<LtiLinkResponse>('/lti/link', { challenge })
  },

  /** Read one recorded Moodle course. Staff only. */
  getContext: (ltiContextId: string) => {
    return api.get<LtiContext>(`/lti/contexts/${ltiContextId}`)
  },

  /**
   * Attach a Moodle course to a local course, or detach it with
   * ``null``. Needs rights over the course in question — a lecturer
   * cannot map a Moodle course onto a Studiengruppe they do not teach.
   */
  mapContext: (ltiContextId: string, courseId: string | null) => {
    return api.put<LtiContext>(`/lti/contexts/${ltiContextId}`, { courseId })
  },
}
