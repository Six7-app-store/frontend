/**
 * Rules of the deployment wizard's draft that several steps and the store
 * must agree on. Pure functions — no Vue, no I/O.
 */

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
