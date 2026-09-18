/**
 * Matches deployment team members to their access credentials and builds the
 * copy-paste access strings (SSH command, per-user URL) for the Teams card on
 * the deployment detail page. Pure functions — no Vue, no I/O.
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
