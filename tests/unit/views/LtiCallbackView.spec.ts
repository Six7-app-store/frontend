/**
 * The landing point of a Moodle launch.
 *
 * Two things matter here. The backend now says where the launch should
 * land, so the view has to follow it — that is what makes a student's
 * click in Moodle open their environment instead of a dashboard.
 *
 * And the path arrives through the address bar, which makes it
 * attacker-controlled input. A crafted launch URL must not be able to
 * turn this redirect into a trip to another site, so anything that is
 * not a plain in-app path falls back to the dashboard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

let mockQuery: Record<string, unknown> = {}
const replace = vi.fn()
const setToken = vi.fn()
const clear = vi.fn()
const fetchMe = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mockQuery }),
  useRouter: () => ({ replace }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ fetchMe }),
}))

vi.mock('@/composables/useLtiSession', () => ({
  useLtiSession: () => ({ setToken, clear }),
}))

vi.mock('lucide-vue-next', () => ({ Loader2: { template: '<span />' } }))

import LtiCallbackView from '@/views/LtiCallbackView.vue'

const land = async (query: Record<string, unknown>) => {
  mockQuery = query
  const wrapper = mount(LtiCallbackView)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMe.mockResolvedValue(undefined)
  // The view rewrites the history entry to drop the token from the URL.
  window.history.replaceState = vi.fn()
})

describe('LtiCallbackView', () => {
  it('stores the token and follows the target the launch computed', async () => {
    await land({ token: 'abc', target: '/deployments/1234' })

    expect(setToken).toHaveBeenCalledWith('abc')
    expect(replace).toHaveBeenCalledWith('/deployments/1234')
  })

  it('falls back to the dashboard when no target was sent', async () => {
    await land({ token: 'abc' })

    expect(replace).toHaveBeenCalledWith('/dashboard')
  })

  it.each([
    ['https://evil.test/phish', 'an absolute URL'],
    ['//evil.test/phish', 'a protocol-relative URL'],
    ['/\\evil.test/phish', 'a backslash-escaped authority'],
    ['deployments/1234', 'a bare relative path'],
  ])('refuses %s (%s) and goes to the dashboard instead', async (target) => {
    await land({ token: 'abc', target })

    expect(replace).toHaveBeenCalledWith('/dashboard')
  })

  it('refuses a repeated target parameter, which arrives as an array', async () => {
    await land({ token: 'abc', target: ['/deployments', 'https://evil.test'] })

    expect(replace).toHaveBeenCalledWith('/dashboard')
  })

  it('does not sign in at all without a token', async () => {
    const wrapper = await land({ target: '/deployments' })

    expect(setToken).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Kein Sitzungstoken')
  })

  it('drops the session when the launch cannot be completed', async () => {
    fetchMe.mockRejectedValue(new Error('nope'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = await land({ token: 'abc', target: '/deployments/1234' })

    expect(clear).toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('konnte nicht abgeschlossen werden')
  })
})
