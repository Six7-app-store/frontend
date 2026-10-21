import { describe, it, expect, vi, beforeEach } from 'vitest'

const deploymentApi = vi.hoisted(() => ({ list: vi.fn(), getMyAccess: vi.fn() }))
vi.mock('@/api/deployment.api', () => ({ deploymentApi }))

import { useMyAccess } from '@/composables/useMyAccess'

const account = { username: 'anna', team: 'Team A', ip: '10.0.0.5', port: 22, auth: 'pw' }
const deployment = (deploymentId: string, status: string) => ({ deploymentId, name: deploymentId, appId: 'app-1', status })
const access = { data: { user_accounts: { 'Team A-anna': account }, team_vms: {} } }

describe('useMyAccess', () => {
  beforeEach(() => {
    deploymentApi.list.mockReset()
    deploymentApi.getMyAccess.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('asks /my-access only for finished deployments', async () => {
    deploymentApi.list.mockResolvedValue({ data: [deployment('dep-ok', 'success'), deployment('dep-busy', 'running')] })
    deploymentApi.getMyAccess.mockResolvedValue(access)
    const { entries, load } = useMyAccess()

    await load()

    expect(deploymentApi.getMyAccess).toHaveBeenCalledTimes(1)
    expect(deploymentApi.getMyAccess).toHaveBeenCalledWith('dep-ok')
    expect(entries.value.map((e) => e.deploymentId)).toEqual(['dep-ok'])
  })

  it('leaves out a deployment the caller may not access, and one without an account', async () => {
    deploymentApi.list.mockResolvedValue({
      data: [deployment('dep-ok', 'success'), deployment('dep-403', 'success'), deployment('dep-none', 'success')],
    })
    deploymentApi.getMyAccess.mockImplementation(async (id: string) => {
      if (id === 'dep-403') throw { response: { status: 403 } }
      if (id === 'dep-none') return { data: { user_accounts: {}, team_vms: {} } }
      return access
    })
    const { entries, loadFailed, load } = useMyAccess()

    await load()

    expect(entries.value.map((e) => e.deploymentId)).toEqual(['dep-ok'])
    expect(loadFailed.value).toBe(false)
  })

  it('reports a failed deployment list', async () => {
    deploymentApi.list.mockRejectedValue(new Error('network'))
    const { entries, isLoading, loadFailed, load } = useMyAccess()

    await load()

    expect(entries.value).toEqual([])
    expect(loadFailed.value).toBe(true)
    expect(isLoading.value).toBe(false)
  })
})
