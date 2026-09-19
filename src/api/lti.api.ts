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

/** Why one Moodle course member did not become an account. */
export type LtiRosterSkipReason =
  /** The membership carried no stable platform subject to key on. */
  | 'no_subject'
  /** No e-mail address — nothing to send deployment credentials to. */
  | 'no_email'
  /** The address belongs to an account this Moodle identity is not
   *  linked to. Only the link challenge may join those two. */
  | 'link_required'
  /** Already in a different Studiengruppe; a Moodle enrolment is not
   *  grounds for moving somebody out of it. */
  | 'already_in_another_group'
  /** Trainer in Moodle, but this deployment does not let a Moodle role
   *  grant the app store's teacher role. */
  | 'instructor_not_trusted'

export interface LtiRosterSkip {
  name: string | null
  email: string | null
  reason: LtiRosterSkipReason
}

/** The signed answer to a deep-linking request, and where it goes. */
export interface LtiDeepLinkSelection {
  /** Post this to ``returnUrl`` as a form field named ``JWT``. */
  jwt: string
  returnUrl: string
  appName: string
}

/** What one roster import did. Counts are of members, not of rows. */
export interface LtiRosterImport {
  context: LtiContext
  courseId: string
  courseName: string
  /** Accounts that did not exist before. */
  created: number
  /** Members already known by their Moodle identity. */
  matched: number
  teachers: number
  students: number
  skipped: LtiRosterSkip[]
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

  /**
   * Create the Studiengruppe behind a Moodle course and fill it from
   * that course's member list.
   *
   * The counterpart to ``mapContext``: that one points at a
   * Studiengruppe that exists, this one makes it when there is none.
   * Staff only — the member list is read from Moodle with the tool's
   * own key. Refused with 409 if the Moodle course is already mapped.
   */
  importContext: (ltiContextId: string, name?: string) => {
    return api.post<LtiRosterImport>(`/lti/contexts/${ltiContextId}/import`, {
      name: name ?? null,
    })
  },

  /**
   * Bind the Moodle activity being created to one app.
   *
   * Answers a deep-linking request: Moodle asked what the activity
   * should point at, and ``handle`` identifies that question. The
   * response has to be **posted from the browser** to ``returnUrl`` as
   * a form field named ``JWT`` — that URL carries the lecturer's Moodle
   * session, which only their browser has.
   *
   * One-shot: a second call with the same handle is refused with 409.
   */
  selectDeepLink: (handle: string, appId: string) => {
    return api.post<LtiDeepLinkSelection>('/lti/deep-link/select', {
      handle,
      appId,
    })
  },
}
