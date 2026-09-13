import api from './axios'

export interface LtiLinkResponse {
  status: 'linked' | 'already_linked'
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
}
