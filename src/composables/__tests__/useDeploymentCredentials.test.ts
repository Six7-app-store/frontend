import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const deploymentApi = vi.hoisted(() => ({ getMyAccess: vi.fn() }))
vi.mock('@/api/deployment.api', () => ({ deploymentApi }))

import { useDeploymentCredentials } from '@/composables/useDeploymentCredentials'
import type { DeploymentWithRelations, Task } from '@/types'

const deployment = ref({
  deploymentId: 'dep-1',
  teams: [
    { teamId: 'team-a', name: 'Team A', members: [{ userId: 'u-anna', username: 'anna', email: 'anna@x.org' }] },
  ],
} as DeploymentWithRelations)

const account = { username: 'anna', team: 'Team A', ip: '10.0.0.5', port: 22, auth: 'pw' }

describe('useDeploymentCredentials', () => {
  beforeEach(() => {
    deploymentApi.getMyAccess.mockReset()
  })

  it('matches accounts from the active data task outputs', () => {
    const task = ref({
      outputs: {
        user_accounts: { value: { 'Team A-anna': account } },
        team_vms: { value: { 'Team A': { url: 'http://vm' } } },
      },
    } as unknown as Task)
    const { enrichedTeams } = useDeploymentCredentials('dep-1', deployment, task)

    expect(enrichedTeams.value[0]!.vm).toEqual({ url: 'http://vm' })
    expect(enrichedTeams.value[0]!.members[0]!.account).toEqual({ key: 'Team A-anna', data: account })
  })

  it('returns no teams without a deployment', () => {
    const { enrichedTeams } = useDeploymentCredentials('dep-1', ref(null), ref(null))
    expect(enrichedTeams.value).toEqual([])
  })

  it('loads the member credentials from /my-access as fallback', async () => {
    deploymentApi.getMyAccess.mockResolvedValue({
      data: { user_accounts: { 'Team A-anna': account }, team_vms: { 'Team A': { url: 'http://mine' } } },
    })
    const { enrichedTeams, typedUserAccounts, teamVms, loadMyAccess } = useDeploymentCredentials('dep-1', deployment, ref(null))

    expect(enrichedTeams.value[0]!.members[0]!.account).toBeNull()
    await loadMyAccess()

    expect(deploymentApi.getMyAccess).toHaveBeenCalledWith('dep-1')
    expect(typedUserAccounts.value).toEqual({ 'Team A-anna': account })
    expect(teamVms.value).toEqual({ 'Team A': { url: 'http://mine' } })
    expect(enrichedTeams.value[0]!.members[0]!.account?.key).toBe('Team A-anna')
  })

  it('logs a failed /my-access request and keeps no credentials', async () => {
    const error = new Error('forbidden')
    deploymentApi.getMyAccess.mockRejectedValue(error)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { typedUserAccounts, loadMyAccess } = useDeploymentCredentials('dep-1', deployment, ref(null))

    await loadMyAccess()

    expect(typedUserAccounts.value).toBeNull()
    expect(spy).toHaveBeenCalledWith('Error loading own access credentials:', error)
    spy.mockRestore()
  })
})
