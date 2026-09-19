/**
 * Matches deployment team members to their access credentials and builds the
 * copy-paste access strings for the Teams card on the deployment detail page:
 * the connection line for the app's protocol (ssh command, RDP/VNC host:port,
 * web URL) plus the per-user URL. Pure functions — no Vue, no I/O.
 */
import type { DeploymentTeam, DeploymentTeamMember } from '@/types'
import type { TeamVm, UserAccount } from '@/services/deployment-outputs.service'

/** An account together with its ``user_accounts`` map key. */
export interface AccountMatch {
  key: string
  data: UserAccount
}

export interface EnrichedTeamMember extends DeploymentTeamMember {
  account: AccountMatch | null
}

export interface EnrichedTeam extends Omit<DeploymentTeam, 'members'> {
  vm: TeamVm | null
  members: EnrichedTeamMember[]
}

// Build a copy-paste SSH command from an account. Skips ``-p`` for the
// default port 22 so the line stays short for the common case.
export function sshCommandFor(data: { username?: string; ip?: string; port?: number }): string {
  if (!data.username || !data.ip) return ''
  const portFlag = data.port && data.port !== 22 ? `-p ${data.port} ` : ''
  return `ssh ${portFlag}${data.username}@${data.ip}`
}

/** The protocols an app may declare in ``user_accounts.<key>.protocol``. */
export const PROTOCOLS = ['ssh', 'rdp', 'vnc', 'web', 'none'] as const
export type Protocol = (typeof PROTOCOLS)[number]

// Ports that identify a protocol on their own. Only consulted when the
// app declared none — an explicit ``protocol`` always wins, so an app
// may serve RDP on a non-standard port.
const PORT_PROTOCOLS: Record<number, Protocol> = { 22: 'ssh', 3389: 'rdp', 5900: 'vnc' }

// The legacy slot some templates wrote before ``protocol`` existed.
const AUTHTYPE_PROTOCOLS: Record<string, Protocol> = { ssh: 'ssh', url: 'web', http: 'web', web: 'web' }

/** The account fields the protocol resolution reads. */
export type ConnectionInput = Partial<
  Pick<UserAccount, 'protocol' | 'authtype' | 'type' | 'ip' | 'port' | 'username'>
>

/**
 * Decide how the user connects. Mirrors ``_resolve_protocol`` in the
 * backend notifier so the deployment page and the access mail never
 * disagree about one account.
 *
 * An explicit ``protocol`` wins. The rules below it exist so apps
 * deployed before the field keep rendering as they did: the legacy
 * ``authtype``, then an ``ssh_key`` credential (which can only mean
 * SSH), then the well-known port, then "it has an ip:port, so it is
 * probably a web UI" — the assumption this page already made.
 */
export function resolveProtocol(data: ConnectionInput, teamVmUrl?: string): Protocol {
  const declared = data.protocol?.trim().toLowerCase()
  if (declared && (PROTOCOLS as readonly string[]).includes(declared)) return declared as Protocol

  const legacy = data.authtype?.trim().toLowerCase()
  const byAuthtype = legacy ? AUTHTYPE_PROTOCOLS[legacy] : undefined
  if (byAuthtype) return byAuthtype

  if (data.type === 'ssh_key') return 'ssh'

  const byPort = data.port ? PORT_PROTOCOLS[data.port] : undefined
  if (byPort) return byPort

  if (data.ip && data.port) return 'web'
  if (teamVmUrl) return 'web'
  return 'ssh'
}

/** One ready-to-use access line, resolved for the account's protocol. */
export interface Connection {
  protocol: Protocol
  /** Pill label, e.g. ``SSH`` / ``RDP`` / ``URL``. */
  label: string
  /** The string to show and copy. */
  value: string
  /** Set for ``web`` only — the pill renders a link instead of text. */
  href?: string
}

/**
 * Build the connection pill for an account: an ssh command, the
 * ``host:port`` an RDP/VNC client dials, or a URL. Returns ``null``
 * when the app ships no reachable endpoint (``protocol: 'none'``) or
 * the account is too incomplete to build a usable line — better no
 * pill than half a one.
 */
export function connectionFor(data: ConnectionInput, teamVmUrl?: string): Connection | null {
  const protocol = resolveProtocol(data, teamVmUrl)
  if (protocol === 'ssh') {
    const value = sshCommandFor(data)
    if (value) return { protocol, label: 'SSH', value }
    // An account too thin for a command (no username) still reaches its
    // machine through the team's Web-UI if the app published one. The
    // per-user URL is deliberately not used here — an ip:port meant for
    // ssh is not an address a browser can open.
    return teamUrlConnection(teamVmUrl)
  }
  if (protocol === 'rdp' || protocol === 'vnc') {
    if (!data.ip) return teamUrlConnection(teamVmUrl)
    const port = data.port ?? (protocol === 'rdp' ? 3389 : 5900)
    return { protocol, label: protocol.toUpperCase(), value: `${data.ip}:${port}` }
  }
  if (protocol === 'web') return webConnection(data, teamVmUrl)
  return null
}

/** The URL pill: the per-user URL when the account carries ip + port,
 * otherwise the team's shared Web-UI. */
function webConnection(data: ConnectionInput, teamVmUrl?: string): Connection | null {
  return urlConnection(userUrlFor(data, teamVmUrl) ?? teamVmUrl)
}

/** The URL pill built from the team's Web-UI alone. */
function teamUrlConnection(teamVmUrl?: string): Connection | null {
  return urlConnection(teamVmUrl)
}

function urlConnection(href?: string | null): Connection | null {
  if (!href) return null
  return { protocol: 'web', label: 'URL', value: href.replace(/^https?:\/\//, ''), href }
}

// Build a per-user URL from user_accounts (ip + port), preserving any path
// suffix the team VM url carries (e.g. "/pgadmin4").
export function userUrlFor(data: { ip?: string; port?: number }, teamVmUrl?: string): string | null {
  if (!data.ip || !data.port) return null
  let path = ''
  if (teamVmUrl) {
    try {
      path = new URL(teamVmUrl).pathname.replace(/\/$/, '')
    } catch { /* ignore malformed url */ }
  }
  return `http://${data.ip}:${data.port}${path}`
}

// Mirror the terraform key sanitisation: lowercase the local-part
// and replace dots with dashes. Only dots — terraform's
// ``replace(local_part, ".", "-")`` does not touch other characters.
export function deriveExpectedAccountKey(teamName: string, email: string | undefined): string | null {
  if (!email) return null
  const localPart = email.split('@')[0]
  if (!localPart) return null
  const sanitised = localPart.replace(/\./g, '-').toLowerCase()
  return `${teamName.trim().toLowerCase()}-${sanitised}`
}

/**
 * Attach the team VM (``team.vm``) and each member's account
 * (``member.account``) to the deployment's teams.
 */
export function matchTeamAccounts(
  teams: DeploymentTeam[],
  accounts: Record<string, UserAccount> | null,
  teamVms: Record<string, TeamVm> | null,
): EnrichedTeam[] {
  // Resolve member ↔ account.
  //
  // The canonical contract is the ``user_accounts`` MAP KEY, which every app
  // template constructs the same way:
  //
  //     key = "<team>-" + email.split("@")[0].replace(".", "-")
  //
  // Since the member's email and team are known here, that key can be
  // reproduced deterministically. The value's ``username`` field is not a
  // reliable identifier (some templates write the email local-part, others a
  // shared team-wide pseudo-email), so we index by key and look up the derived
  // key per member. Three fallbacks cover templates not matched by the key.
  const accountByEmail = new Map<string, AccountMatch>()
  const accountByUsername = new Map<string, AccountMatch>()
  const accountByKey = new Map<string, AccountMatch>()
  if (accounts) {
    for (const [key, acc] of Object.entries(accounts)) {
      const candidate = acc?.username?.trim().toLowerCase()
      if (candidate && candidate.includes('@')) {
        accountByEmail.set(candidate, { key, data: acc })
      } else if (candidate) {
        accountByUsername.set(candidate, { key, data: acc })
      }
      accountByKey.set(key.trim().toLowerCase(), { key, data: acc })
    }
  }

  return teams.map(team => {
    // Team-level VM metadata from terraform's ``team_vms`` output. Apps
    // that serve a Web-UI publish ``url`` here; SSH-only apps don't.
    // We surface that as ``team.vm`` so the template can decide between
    // a URL pill and an SSH-command pill per team.
    const vm = teamVms?.[team.name] ?? null
    const teamNameLower = team.name.trim().toLowerCase()
    return {
      ...team,
      vm,
      members: team.members.map(member => {
        const memberEmail = member?.email?.trim().toLowerCase()
        const memberName = member?.username?.trim().toLowerCase()

        // Strategy 0 (canonical): derive the terraform key from
        // member.email + team.name and look it up directly.
        let hit: AccountMatch | undefined
        const expectedKey = deriveExpectedAccountKey(team.name, memberEmail)
        if (expectedKey) hit = accountByKey.get(expectedKey)

        // Strategy 1: email-based (templates that write the
        // member's full email into ``account.username``).
        if (!hit && memberEmail) hit = accountByEmail.get(memberEmail)

        // Strategy 2: username substring against account.username
        if (!hit && memberName) {
          for (const [accUser, entry] of accountByUsername) {
            if (accUser.includes(memberName) || memberName.includes(accUser)) {
              hit = entry
              break
            }
          }
        }

        // Strategy 3: username substring against the account key
        // (``Team #1-leon-priemer`` etc.). Last-resort fallback
        // for templates where ``account.username`` is missing
        // and the keycloak username happens to match the slug.
        if (!hit && memberName) {
          for (const [accKey, entry] of accountByKey) {
            if (accKey.includes(memberName)) {
              hit = entry
              break
            }
          }
        }

        // Team scope guard so an account from team A can't be
        // attached to a member of team B.
        const accountTeam = hit?.data.team?.trim().toLowerCase()
        const keyLower = hit?.key.trim().toLowerCase()
        const teamMatches = hit && (
          accountTeam === teamNameLower ||
          (keyLower?.startsWith(`${teamNameLower}-`) ?? false) ||
          (keyLower?.includes(teamNameLower) ?? false)
        )
        return {
          ...member,
          account: teamMatches ? hit! : null,
        }
      }),
    }
  })
}
