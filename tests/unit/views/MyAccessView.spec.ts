/**
 * "My Access": every finished deployment of the caller shows up with
 * the caller's own access pills; without any, the page says when they
 * will appear instead of leaving a dead end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const deploymentApi = vi.hoisted(() => ({ list: vi.fn(), getMyAccess: vi.fn() }))
vi.mock('@/api/deployment.api', () => ({ deploymentApi }))

import MyAccessView from '@/views/MyAccessView.vue'

const account = { username: 'anna', team: 'Team A', ip: '10.0.0.5', port: 22, auth: 'geheim', protocol: 'ssh' }

const render = () =>
  mount(MyAccessView, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        RouterLink: { template: '<a><slot /></a>', props: ['to'] },
        PageHeader: { props: ['title', 'subtitle'], template: '<h1>{{ title }}</h1>' },
      },
    },
  })

beforeEach(() => {
  deploymentApi.list.mockReset()
  deploymentApi.getMyAccess.mockReset()
})

describe('MyAccessView', () => {
  it('lists the own credentials of each finished deployment', async () => {
    deploymentApi.list.mockResolvedValue({
      data: [{ deploymentId: 'dep-1', name: 'Labor 1', appId: 'app-1', status: 'success' }],
    })
    deploymentApi.getMyAccess.mockResolvedValue({ data: { user_accounts: { 'Team A-anna': account }, team_vms: {} } })

    const wrapper = render()
    await flushPromises()

    const entries = wrapper.findAll('[data-testid="my-access-entry"]')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.text()).toContain('Labor 1')
    expect(entries[0]!.text()).toContain('ssh anna@10.0.0.5')
  })

  it('keeps the password hidden until it is revealed', async () => {
    deploymentApi.list.mockResolvedValue({
      data: [{ deploymentId: 'dep-1', name: 'Labor 1', appId: 'app-1', status: 'success' }],
    })
    deploymentApi.getMyAccess.mockResolvedValue({ data: { user_accounts: { 'Team A-anna': account }, team_vms: {} } })

    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).not.toContain('geheim')

    await wrapper.find('button[aria-pressed]').trigger('click')
    expect(wrapper.text()).toContain('geheim')
  })

  it('says when credentials will appear while there are none', async () => {
    deploymentApi.list.mockResolvedValue({ data: [] })

    const wrapper = render()
    await flushPromises()

    expect(wrapper.text()).toContain('MyAccessView.empty')
    expect(wrapper.text()).toContain('MyAccessView.emptyHint')
  })
})
