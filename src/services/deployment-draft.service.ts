/**
 * Rules of the deployment wizard's draft that several steps and the store
 * must agree on, and the create request built from it. Pure functions —
 * no Vue, no I/O.
 */
import type { DeploymentCreate, DeploymentDraft, DeploymentFile } from '@/types'

/**
 * The version a draft deploys. ``releaseTag`` is a plain tag string; older
 * callers passed a release object, whose ``version`` (or ``name``) is used.
 * Nothing set is ``''`` — there is no guessed fallback: the wizard does not
 * start without a version.
 */
export function releaseVersion(releaseTag: unknown): string {
  if (releaseTag && typeof releaseTag === 'object') {
    const tag = releaseTag as { version?: string; name?: string }
    return tag.version || tag.name || ''
  }
  if (typeof releaseTag === 'string' && releaseTag.trim() !== '') return releaseTag
  return ''
}

/** The name the wizard suggests: ``<App> – <Kurs> – <Datum>``, leaving out what is not known. */
export function suggestedName(appName: string, target: string, date: string): string {
  return [appName, target, date].map((part) => part.trim()).filter(Boolean).join(' – ')
}

/** App and version the wizard deploys. */
export interface ChosenRelease {
  appId: string
  appName: string
  releaseTag: string
}

/**
 * The draft fields for choosing ``release``. Another app or version has
 * other variables and files, so everything loaded or entered for the old
 * one is dropped; the same release changes nothing else.
 */
export function withRelease(draft: DeploymentDraft, release: ChosenRelease): Partial<DeploymentDraft> {
  const same = draft.appId === release.appId && draft.releaseTag === release.releaseTag
  const chosen = { appId: release.appId, appName: release.appName, releaseTag: release.releaseTag }
  if (same) return chosen
  return {
    ...chosen,
    variableDefinitions: [],
    variables: {},
    userInputVar: {},
    fileUploads: {},
    filesLost: false,
  }
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

/**
 * The first ``count`` member lists of ``assignments``, which older drafts
 * keep as an index-keyed object instead of an array; a missing team is ``[]``.
 */
export function teamLists(assignments: unknown, count: number): string[][] {
  const source = (assignments && typeof assignments === 'object' ? assignments : {}) as Record<number, unknown>
  return Array.from({ length: count }, (_, i) => (Array.isArray(source[i]) ? (source[i] as string[]) : []))
}

/** One team of a draft, as the backend takes it. */
export interface DraftTeam {
  name: string
  userIds: string[]
}

/**
 * The teams a draft deploys, following its split mode:
 *
 * - ``one``: everybody in one team,
 * - ``eachUser``: a team per person,
 * - ``custom``: the teams the user formed — members who are no longer
 *   selected are left out; without any formed team the students are split
 *   evenly into ``groupCount`` teams.
 *
 * The first two never read ``assignments``, so a draft can never sit in
 * "one team" with nobody assigned to it.
 */
export function wizardTeams(draft: DeploymentDraft): DraftTeam[] {
  const students = draft.studentIds.map(String)
  const nameOf = (i: number) => draft.groupNames?.[i]?.trim() || fallbackTeamName(i)
  if (students.length === 0) return []
  if (draft.groupMode === 'one') return [{ name: nameOf(0), userIds: students }]
  if (draft.groupMode === 'eachUser') return students.map((id, i) => ({ name: fallbackTeamName(i), userIds: [id] }))

  const selected = new Set(students)
  const count = Math.max(draft.groupCount || 1, 1)
  const assignments = teamLists(draft.assignments, count)
  const formed = assignments.some((team) => team.length > 0)
  if (!formed) {
    return distributeEvenly(students, count).map((userIds, i) => ({ name: nameOf(i), userIds }))
  }
  return Array.from({ length: count }, (_, i) => ({
    name: nameOf(i),
    userIds: assignments[i]!.map(String).filter((id) => selected.has(id)),
  }))
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
    teams: wizardTeams(draft),
  }
  const files = draftFiles(draft)
  if (Object.keys(files).length > 0) payload.files = files
  return payload as unknown as DeploymentCreate
}
