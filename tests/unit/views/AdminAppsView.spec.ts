import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import AdminAppsView from '@/views/AdminAppsView.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/api/app.api', () => ({
  appApi: {
    list: vi.fn(),
    listVersionApprovals: vi.fn(),
    admin: {
      listPendingApprovals: vi.fn(),
      approveVersion: vi.fn(),
      rejectVersion: vi.fn(),
      revokeVersion: vi.fn(),
    },
  },
}))
import { appApi } from '@/api/app.api'

const mountView = () =>
  mount(AdminAppsView, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })

describe('AdminAppsView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(appApi.list as any).mockResolvedValue({
      data: [{ appId: 'a1', name: 'Jupyter Lab', is_private: false }],
    })
    ;(appApi.admin.listPendingApprovals as any).mockResolvedValue({
      data: [{ appId: 'a1', version_tag: 'v1.0.0', status: 'pending' }],
    })
    ;(appApi.listVersionApprovals as any).mockResolvedValue({
      data: [{ approvalId: 'p1', appId: 'a1', version_tag: 'v1.0.0', status: 'pending', created_at: '2026-09-01' }],
    })
  })

  const expandFirstApp = async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find('button.w-full').trigger('click')
    await flushPromises()
    return wrapper
  }

  const buttonWithText = (wrapper: ReturnType<typeof mountView>, text: string) =>
    wrapper.findAll('button').find((b) => b.text().includes(text))!

  it('names the app in the reject dialog', async () => {
    const wrapper = await expandFirstApp()

    await buttonWithText(wrapper, 'AdminAppsView.rejectBtn').trigger('click')

    const dialog = wrapper.find('.surface-overlay')
    expect(dialog.text()).toContain('v1.0.0')
    expect(dialog.text()).toContain('Jupyter Lab')
  })

  it('approves a pending version by app id and tag', async () => {
    ;(appApi.admin.approveVersion as any).mockResolvedValue({})
    const wrapper = await expandFirstApp()

    await buttonWithText(wrapper, 'AdminAppsView.approveBtn').trigger('click')
    await flushPromises()

    expect(appApi.admin.approveVersion).toHaveBeenCalledWith('a1', 'v1.0.0')
  })
})
