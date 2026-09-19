import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLtiLink } from '../useLtiLink'

vi.mock('@/api/lti.api', () => ({
  ltiApi: { link: vi.fn(() => Promise.resolve({ data: { status: 'linked' } })) },
}))

describe('useLtiLink', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('keeps a challenge across the detour through the login', () => {
    const link = useLtiLink()

    link.remember('challenge-token')

    // The sign-in leaves the page and comes back, so the challenge has
    // to survive a full navigation — memory is not enough.
    expect(useLtiLink().pending()).toBe('challenge-token')
  })

  it('forgets a challenge once it is spent', () => {
    const link = useLtiLink()
    link.remember('challenge-token')

    link.forget()

    expect(link.pending()).toBeNull()
  })

  it('sends the challenge to the backend', async () => {
    const { ltiApi } = await import('@/api/lti.api')

    await useLtiLink().submit('challenge-token')

    expect(ltiApi.link).toHaveBeenCalledWith('challenge-token')
  })
})
