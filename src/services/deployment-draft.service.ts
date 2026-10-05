/**
 * Rules of the deployment wizard's draft that several steps and the store
 * must agree on, and the create request built from it. Pure functions —
 * no Vue, no I/O.
 */
import type { DeploymentCreate, DeploymentDraft, DeploymentFile } from '@/types'

/**
 * The version a draft deploys. ``releaseTag`` is a plain tag string; older
 * callers passed a release object, whose ``version`` (or ``name``) is used.
 * Nothing set means ``latest``.
 */
export function releaseVersion(releaseTag: unknown): string {
  if (releaseTag && typeof releaseTag === 'object') {
    const tag = releaseTag as { version?: string; name?: string }
    return tag.version || tag.name || 'latest'
  }
  if (typeof releaseTag === 'string' && releaseTag.trim() !== '') return releaseTag
  return 'latest'
}

/**
 * Name of the team at ``index`` when the user gave it none. The variable
 * step keys per-team values by this name and the store submits teams under
 * it, so both must produce the same string.
 */
export function fallbackTeamName(index: number): string {
  return `Team-${index + 1}`
}

/**
 * Splits ``ids`` into ``count`` consecutive groups whose sizes differ by at
 * most one; the first ``ids.length % count`` groups get the extra member.
 */
export function distributeEvenly<T>(ids: readonly T[], count: number): T[][] {
  const perGroup = Math.floor(ids.length / count)
  const remainder = ids.length % count
  const groups: T[][] = []
  let start = 0
  for (let i = 0; i < count; i++) {
    const size = perGroup + (i < remainder ? 1 : 0)
    groups.push(ids.slice(start, start + size))
    start += size
  }
  return groups
}

/** Teams as the backend takes them: named teams, or the students split evenly into ``Team-n``. */
function draftTeams(draft: DeploymentDraft): Array<{ name: string; userIds: string[] }> {
  const assignments = draft.assignments as unknown as Record<number, string[] | undefined>
  let teams = Array.isArray(draft.groupNames) && Array.isArray(draft.assignments)
    ? draft.groupNames.map((name, idx) => ({
        name,
        userIds: Array.isArray(assignments[idx]) ? assignments[idx]! : [],
      }))
    : []
  if (teams.length === 0 && draft.studentIds.length > 0) {
    teams = distributeEvenly(draft.studentIds, draft.groupCount).map((userIds, i) => ({
      name: draft.groupNames[i] || fallbackTeamName(i),
      userIds,
    }))
  }
  return teams.map((team) => ({ name: team.name, userIds: team.userIds.map(String) }))
}

/**
 * The variable values the worker hands to OpenTofu: ``{ tofu: {...} }``.
 * Unset and empty values — also a scoped variable with no filled slot — are
 * left out so the HCL default applies instead of null. File variables
 * travel separately.
 */
function draftUserInputVar(draft: DeploymentDraft): { tofu: Record<string, any> } {
  const out: { tofu: Record<string, any> } = { tofu: {} }
  if (!draft.variables || typeof draft.variables !== 'object') return out
  const variables = draft.variables as Record<string, any>
  if (!Array.isArray(draft.variableDefinitions)) {
    out.tofu = { ...variables }
    return out
  }

  for (const def of draft.variableDefinitions) {
    if (def.osType === 'file') continue
    const val = variables[def.name]
    if (val === undefined || val === null) continue
    if (typeof val === 'string' && val.trim() === '') continue
    if (typeof val === 'object' && !Array.isArray(val)
      && (def.varScope === 'team' || def.varScope === 'user')
      && Object.keys(val).length === 0) continue
    out.tofu[def.name] = val
  }
  return out
}

/** File slots that actually hold a file; a slot the user never filled would trip the backend's empty-file check. */
function draftFiles(draft: DeploymentDraft): Record<string, Record<string, DeploymentFile>> {
  const files: Record<string, Record<string, DeploymentFile>> = {}
  for (const [varName, slots] of Object.entries(draft.fileUploads || {})) {
    const filled = Object.fromEntries(
      Object.entries(slots || {}).filter((entry): entry is [string, DeploymentFile] => !!entry[1]?.content_b64),
    )
    if (Object.keys(filled).length > 0) files[varName] = filled
  }
  return files
}

/** The create request for a draft: app, name, version, teams, variable values and uploaded files. */
export function buildDeploymentPayload(draft: DeploymentDraft): DeploymentCreate {
  const payload: Record<string, unknown> = {
    name: draft.name,
    appId: draft.appId,
    releaseTag: releaseVersion(draft.releaseTag),
    userInputVar: draftUserInputVar(draft),
    teams: draftTeams(draft),
  }
  const files = draftFiles(draft)
  if (Object.keys(files).length > 0) payload.files = files
  return payload as unknown as DeploymentCreate
}
