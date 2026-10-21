import { describe, it, expect } from 'vitest'
import { isAccessReady, toMyAccessEntry } from '@/services/my-access.service'

const deployment = { deploymentId: 'dep-1', name: 'Labor 1', appId: 'app-1' }
const account = { username: 'anna', team: 'Team A', ip: '10.0.0.5', port: 22, auth: 'pw' }

describe('isAccessReady', () => {
  it.each([
    ['success', true],
    ['pending', false],
    ['running', false],
    ['failed', false],
    ['paused', false],
    ['destroyed', false],
  ] as const)('treats status %s as ready: %s', (status, expected) => {
    expect(isAccessReady({ status })).toBe(expected)
  })
})

describe('toMyAccessEntry', () => {
  it('builds the entry from the caller\'s own account and team VM', () => {
    const entry = toMyAccessEntry(deployment, {
      user_accounts: { 'Team A-anna': account },
      team_vms: { 'Team A': { url: 'http://vm' } },
    })

    expect(entry).toEqual({
      deploymentId: 'dep-1',
      name: 'Labor 1',
      appId: 'app-1',
      account: { key: 'Team A-anna', data: account },
      teamVm: { url: 'http://vm' },
    })
  })

  it('has no team VM when the app reports none', () => {
    const entry = toMyAccessEntry(deployment, { user_accounts: { 'Team A-anna': account }, team_vms: {} })
    expect(entry?.teamVm).toBeNull()
  })

  it.each([
    ['empty maps', { user_accounts: {}, team_vms: {} }],
    ['no response', null],
  ])('yields nothing for %s', (_, response) => {
    expect(toMyAccessEntry(deployment, response)).toBeNull()
  })
})
