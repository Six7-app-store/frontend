import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import CallbackView from '@/views/CallbackView.vue'

const h = vi.hoisted(() => ({ push: vi.fn(), handleCallback: vi.fn() }))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: h.push }) }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ handleCallback: h.handleCallback }),
}))

describe('CallbackView.vue', () => {
  beforeEach(() => vi.clearAllMocks())

  const finishSignIn = async (returnUrl: string | null) => {
    h.handleCallback.mockResolvedValue(returnUrl)
    mount(CallbackView, { global: { mocks: { $t: (k: string) => k } } })
    await flushPromises()
  }

  it('returns to the in-app page the sign-in started from', async () => {
    await finishSignIn('/deployments/d1')
    expect(h.push).toHaveBeenCalledWith('/deployments/d1')
  })

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example', null])(
    'sends %j to the dashboard instead',
    async (returnUrl) => {
      await finishSignIn(returnUrl)
      expect(h.push).toHaveBeenCalledWith({ name: 'dashboard' })
    },
  )
})
