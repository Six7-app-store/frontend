import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

let routeQuery: Record<string, string> = {}
const login = vi.fn()
let auth: { isAuthenticated: boolean; isLtiSession: boolean; login: typeof login }

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => auth,
}))

vi.mock('@/api/lti.api', () => ({
  ltiApi: { link: vi.fn(() => Promise.resolve({ data: { status: 'linked' } })) },
}))

import LtiLinkView from '../LtiLinkView.vue'

describe('LtiLinkView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    routeQuery = { challenge: 'challenge-token' }
    auth = { isAuthenticated: false, isLtiSession: false, login }
  })

  it('asks an unauthenticated visitor to sign in, and links nothing yet', async () => {
    const wrapper = mount(LtiLinkView)
    await flushPromises()

    const { ltiApi } = await import('@/api/lti.api')
    expect(ltiApi.link).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="link-login"]').exists()).toBe(true)

    await wrapper.find('[data-testid="link-login"]').trigger('click')

    expect(login).toHaveBeenCalledWith('/lti/link')
  })

  it('takes the challenge out of the URL', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')

    mount(LtiLinkView)
    await flushPromises()

    // Kept for the return trip, but not left in the address bar.
    expect(sessionStorage.getItem('lti_link_challenge')).toBe('challenge-token')
    expect(replaceState).toHaveBeenCalledWith({}, '', '/lti/link')
  })

  it('links the account once the visitor is signed in', async () => {
    auth.isAuthenticated = true

    const wrapper = mount(LtiLinkView)
    await flushPromises()

    const { ltiApi } = await import('@/api/lti.api')
    expect(ltiApi.link).toHaveBeenCalledWith('challenge-token')
    expect(wrapper.find('[data-testid="link-success"]').exists()).toBe(true)
    // Spent — a reload must not try the same one again.
    expect(sessionStorage.getItem('lti_link_challenge')).toBeNull()
  })

  it('spends the challenge kept from before the login, not one from the URL', async () => {
    auth.isAuthenticated = true
    routeQuery = {}
    sessionStorage.setItem('lti_link_challenge', 'challenge-from-before')

    mount(LtiLinkView)
    await flushPromises()

    const { ltiApi } = await import('@/api/lti.api')
    expect(ltiApi.link).toHaveBeenCalledWith('challenge-from-before')
  })

  it('points a spent challenge back to Moodle', async () => {
    auth.isAuthenticated = true
    const { ltiApi } = await import('@/api/lti.api')
    vi.mocked(ltiApi.link).mockRejectedValueOnce({
      response: { status: 409, data: { detail: { code: 'lti_link_challenge_spent' } } },
    })

    const wrapper = mount(LtiLinkView)
    await flushPromises()

    expect(wrapper.find('[data-testid="link-error"]').text()).toContain('Moodle')
    expect(sessionStorage.getItem('lti_link_challenge')).toBeNull()
  })

  it('says so when there is nothing to link', async () => {
    routeQuery = {}

    const wrapper = mount(LtiLinkView)
    await flushPromises()

    expect(wrapper.find('[data-testid="link-error"]').exists()).toBe(true)
  })
})
