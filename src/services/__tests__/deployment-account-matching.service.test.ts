import { describe, it, expect } from 'vitest'

import {
  sshCommandFor,
  userUrlFor,
  resolveProtocol,
  connectionFor,
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


describe('resolveProtocol', () => {
  it('honours an explicit protocol over every inference', () => {
    expect(resolveProtocol({ protocol: 'rdp', ip: '1.2.3.4', port: 8080 })).toBe('rdp')
    expect(resolveProtocol({ protocol: ' RDP ', ip: '1.2.3.4', port: 22 })).toBe('rdp')
    expect(resolveProtocol({ protocol: 'none', ip: '1.2.3.4', port: 8080 })).toBe('none')
  })

  it('falls through to inference for an unknown protocol', () => {
    expect(resolveProtocol({ protocol: 'telnet', ip: '1.2.3.4', port: 3389 })).toBe('rdp')
  })

  it('reads the legacy authtype slot', () => {
    expect(resolveProtocol({ authtype: 'ssh', ip: '1.2.3.4', port: 8080 })).toBe('ssh')
    expect(resolveProtocol({ authtype: 'url', ip: '1.2.3.4', port: 8080 })).toBe('web')
  })

  it('infers from the credential type and the well-known port', () => {
    expect(resolveProtocol({ type: 'ssh_key', ip: '1.2.3.4', port: 8080 })).toBe('ssh')
    expect(resolveProtocol({ ip: '1.2.3.4', port: 3389 })).toBe('rdp')
    expect(resolveProtocol({ ip: '1.2.3.4', port: 5900 })).toBe('vnc')
    expect(resolveProtocol({ ip: '1.2.3.4', port: 22 })).toBe('ssh')
  })

  it('keeps the old defaults: ip:port is a web UI, anything else is ssh', () => {
    expect(resolveProtocol({ ip: '1.2.3.4', port: 8080 })).toBe('web')
    expect(resolveProtocol({ ip: '1.2.3.4', username: 'anna' })).toBe('ssh')
    expect(resolveProtocol({}, 'http://1.2.3.4:8080')).toBe('web')
    expect(resolveProtocol({})).toBe('ssh')
  })
})

describe('connectionFor', () => {
  it('builds an ssh command for ssh accounts', () => {
    expect(connectionFor({ ip: '1.2.3.4', port: 22, username: 'anna' })).toEqual({
      protocol: 'ssh',
      label: 'SSH',
      value: 'ssh anna@1.2.3.4',
    })
  })

  it('builds a host:port for rdp and vnc, never a command or a link', () => {
    expect(connectionFor({ protocol: 'rdp', ip: '10.200.5.60', port: 3389, username: 'hannahroth' })).toEqual({
      protocol: 'rdp',
      label: 'RDP',
      value: '10.200.5.60:3389',
    })
    // Default ports when the app leaves the port out.
    expect(connectionFor({ protocol: 'rdp', ip: '10.200.5.60' })?.value).toBe('10.200.5.60:3389')
    expect(connectionFor({ protocol: 'vnc', ip: '10.200.5.60' })?.value).toBe('10.200.5.60:5900')
  })

  it('builds a link for web accounts and strips the scheme from the label', () => {
    expect(connectionFor({ ip: '1.2.3.4', port: 8080 }, 'http://1.2.3.4/pgadmin4')).toEqual({
      protocol: 'web',
      label: 'URL',
      value: '1.2.3.4:8080/pgadmin4',
      href: 'http://1.2.3.4:8080/pgadmin4',
    })
    // No per-user port: fall back to the team VM URL.
    expect(connectionFor({ authtype: 'url' }, 'http://1.2.3.4:8080')?.href).toBe('http://1.2.3.4:8080')
  })

  it('falls back to the team Web-UI when the protocol line cannot be built', () => {
    // An ssh_key account without a username — no command is possible,
    // but the team's shared URL still reaches the machine.
    expect(connectionFor({ type: 'ssh_key', ip: '1.2.3.4', port: 22 }, 'http://1.2.3.4/pgadmin4/')).toEqual({
      protocol: 'web',
      label: 'URL',
      value: '1.2.3.4/pgadmin4/',
      href: 'http://1.2.3.4/pgadmin4/',
    })
    expect(connectionFor({ protocol: 'rdp' }, 'http://1.2.3.4:8080')?.protocol).toBe('web')
  })

  it('returns null rather than half a line', () => {
    expect(connectionFor({ protocol: 'none', ip: '1.2.3.4', port: 3389 })).toBeNull()
    expect(connectionFor({ protocol: 'rdp' })).toBeNull()
    expect(connectionFor({ ip: '1.2.3.4' })).toBeNull()
    expect(connectionFor({})).toBeNull()
  })
})
