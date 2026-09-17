import { describe, it, expect } from 'vitest'

import {
  sshCommandFor,
  userUrlFor,
  deriveExpectedAccountKey,
  matchTeamAccounts,
} from '@/services/deployment-account-matching.service'
import type { UserAccount } from '@/services/deployment-outputs.service'
import type { DeploymentTeam } from '@/types'

const acc = (overrides: Partial<UserAccount>): UserAccount =>
  ({ username: '', team: '', ip: '10.0.0.1', port: 22, auth: 'pw', ...overrides }) as UserAccount

const team = (name: string, members: Array<[string, string]>): DeploymentTeam => ({
  teamId: `id-${name}`,
  name,
  members: members.map(([username, email]) => ({ userId: `u-${username}`, username, email })),
})

const accountOf = (teams: ReturnType<typeof matchTeamAccounts>, username: string) =>
  teams.flatMap((t) => t.members).find((m) => m.username === username)?.account ?? null

describe('sshCommandFor', () => {
  it('builds the command and omits -p for port 22', () => {
    expect(sshCommandFor({ username: 'anna', ip: '10.0.0.5', port: 22 })).toBe('ssh anna@10.0.0.5')
    expect(sshCommandFor({ username: 'anna', ip: '10.0.0.5' })).toBe('ssh anna@10.0.0.5')
    expect(sshCommandFor({ username: 'anna', ip: '10.0.0.5', port: 2222 })).toBe('ssh -p 2222 anna@10.0.0.5')
  })

  it('returns an empty string without username or ip', () => {
    expect(sshCommandFor({ ip: '10.0.0.5' })).toBe('')
    expect(sshCommandFor({ username: 'anna' })).toBe('')
  })
})

describe('userUrlFor', () => {
  it('builds an http URL from ip and port', () => {
    expect(userUrlFor({ ip: '1.2.3.4', port: 8080 })).toBe('http://1.2.3.4:8080')
  })

  it('keeps the team VM path without trailing slash', () => {
    expect(userUrlFor({ ip: '1.2.3.4', port: 8080 }, 'http://1.2.3.4/pgadmin4/')).toBe('http://1.2.3.4:8080/pgadmin4')
  })

  it('ignores malformed team VM URLs and returns null without ip or port', () => {
    expect(userUrlFor({ ip: '1.2.3.4', port: 8080 }, 'not a url')).toBe('http://1.2.3.4:8080')
    expect(userUrlFor({ ip: '1.2.3.4' })).toBeNull()
  })
})

describe('deriveExpectedAccountKey', () => {
  it('mirrors the terraform key: team + local-part with dots → dashes', () => {
    expect(deriveExpectedAccountKey(' Team A ', 'Anna.Maria.S@x.org')).toBe('team a-anna-maria-s')
    expect(deriveExpectedAccountKey('T', 'a_b+c@x.org')).toBe('t-a_b+c')
  })

  it('returns null without an email or local-part', () => {
    expect(deriveExpectedAccountKey('T', undefined)).toBeNull()
    expect(deriveExpectedAccountKey('T', '@x.org')).toBeNull()
  })
})

describe('matchTeamAccounts', () => {
  it('attaches the team VM by team name', () => {
    const [t] = matchTeamAccounts([team('Team A', [])], null, { 'Team A': { url: 'http://vm' } })
    expect(t!.vm).toEqual({ url: 'http://vm' })
    expect(matchTeamAccounts([team('Team B', [])], null, null)[0]!.vm).toBeNull()
  })

  it('matches by derived key, email, username and key substring', () => {
    const accounts = {
      'Team A-anna-s': acc({ username: 'shared@team', team: 'Team A' }),
      'k1': acc({ username: 'dave@x.org', team: 'Team A' }),
      'k2': acc({ username: 'bobby', team: 'Team A' }),
      'Team A-erin': acc({ username: undefined as unknown as string, team: 'Team A' }),
    }
    const teams = matchTeamAccounts(
      [team('Team A', [['anna', 'anna.s@x.org'], ['dave', 'Dave@x.org'], ['bob', 'bob@x.org'], ['erin', 'e@x.org']])],
      accounts,
      null,
    )
    expect(accountOf(teams, 'anna')?.key).toBe('Team A-anna-s')
    expect(accountOf(teams, 'dave')?.key).toBe('k1')
    expect(accountOf(teams, 'bob')?.key).toBe('k2')
    expect(accountOf(teams, 'erin')?.key).toBe('Team A-erin')
  })

  it('rejects matches from another team', () => {
    const accounts = { 'Team A-anna': acc({ username: 'anna', team: 'Team A' }) }
    const teams = matchTeamAccounts([team('Team B', [['annabelle', 'annabelle@x.org']])], accounts, null)
    expect(accountOf(teams, 'annabelle')).toBeNull()
  })

  it('accepts a team match via the key prefix when account.team differs', () => {
    const accounts = { 'team b-carl': acc({ username: 'carl', team: 'other' }) }
    const teams = matchTeamAccounts([team('Team B', [['carl', 'carl@x.org']])], accounts, null)
    expect(accountOf(teams, 'carl')?.key).toBe('team b-carl')
  })

  it('returns null accounts without any accounts', () => {
    const teams = matchTeamAccounts([team('Team A', [['anna', 'anna@x.org']])], null, null)
    expect(accountOf(teams, 'anna')).toBeNull()
  })
})
