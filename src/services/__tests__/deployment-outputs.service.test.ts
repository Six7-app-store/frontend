import { describe, it, expect, vi, afterEach } from 'vitest'

import { extractUserAccounts, extractTeamVms, type UserAccount } from '@/services/deployment-outputs.service'

const account: UserAccount = {
  username: 'anna', team: 'Team A', ip: '10.0.0.5', port: 22, auth: 'pw',
}
const fallbackAccounts = { 'Team A-own': { ...account, username: 'own' } }
const fallbackVms = { 'Team A': { url: 'http://fallback' } }

describe('extractUserAccounts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the fallback without outputs', () => {
    expect(extractUserAccounts(null, fallbackAccounts)).toBe(fallbackAccounts)
    expect(extractUserAccounts(undefined, null)).toBeNull()
  })

  it('reads user_accounts.value from an object or a JSON string', () => {
    const outputs = { user_accounts: { value: { 'Team A-anna': account } } }
    expect(extractUserAccounts(outputs, null)).toEqual({ 'Team A-anna': account })
    expect(extractUserAccounts(`  ${JSON.stringify(outputs)}`, null)).toEqual({ 'Team A-anna': account })
  })

  it('falls back when user_accounts or its value is missing', () => {
    expect(extractUserAccounts({ team_vms: { value: {} } }, fallbackAccounts)).toBe(fallbackAccounts)
    expect(extractUserAccounts({ user_accounts: { sensitive: true } }, fallbackAccounts)).toBe(fallbackAccounts)
    expect(extractUserAccounts('not json', fallbackAccounts)).toBe(fallbackAccounts)
  })

  it('logs and falls back on a broken JSON string', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(extractUserAccounts('{broken', fallbackAccounts)).toBe(fallbackAccounts)
    expect(spy).toHaveBeenCalledWith('Failed to parse raw outputs data:', expect.any(SyntaxError))
  })
})

describe('extractTeamVms', () => {
  it('returns the fallback without outputs', () => {
    expect(extractTeamVms(null, fallbackVms)).toBe(fallbackVms)
  })

  it('reads team_vms.value from an object or a JSON string', () => {
    const outputs = { team_vms: { value: { 'Team A': { url: 'http://vm' } } } }
    expect(extractTeamVms(outputs, null)).toEqual({ 'Team A': { url: 'http://vm' } })
    expect(extractTeamVms(JSON.stringify(outputs), null)).toEqual({ 'Team A': { url: 'http://vm' } })
  })

  it('falls back silently on broken JSON and on non-object values', () => {
    const spy = vi.spyOn(console, 'error')
    expect(extractTeamVms('{broken', fallbackVms)).toBe(fallbackVms)
    expect(extractTeamVms({ team_vms: { value: 'x' } }, fallbackVms)).toBe(fallbackVms)
    expect(extractTeamVms({}, null)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})
