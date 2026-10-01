/**
 * Rules of the wizard's team-assignment step: who sits in which team, and
 * when the step is complete. Pure functions — no Vue, no I/O. ``assignments``
 * holds one list of student IDs per team, in team order.
 */

/** ``assignments`` without ``studentId`` in any team. */
export function withoutStudent(assignments: readonly string[][], studentId: string): string[][] {
  return assignments.map((team) => (team ?? []).filter((id) => id !== studentId))
}

/**
 * Moves ``studentId`` into team ``target``, out of whichever team held it
 * before. ``null`` puts the student back into the unassigned pool.
 */
export function moveStudent(
  assignments: readonly string[][],
  studentId: string,
  target: number | null,
): string[][] {
  const next = withoutStudent(assignments, studentId)
  if (target !== null) {
    while (next.length <= target) next.push([])
    next[target]!.push(studentId)
  }
  return next
}

/** The selected students no team holds yet, in selection order. */
export function unassignedIds(studentIds: readonly string[], assignments: readonly string[][]): string[] {
  const assigned = new Set(assignments.flatMap((team) => team ?? []))
  return studentIds.filter((id) => !assigned.has(id))
}

/** A Fisher-Yates shuffled copy of ``ids``; ``random`` is injectable for tests. */
export function shuffled<T>(ids: readonly T[], random: () => number = Math.random): T[] {
  const out = [...ids]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * The step is complete when nobody is left in the pool and each of the first
 * ``count`` teams has at least one member and a non-blank name.
 */
export function canProceed(
  assignments: readonly string[][],
  names: readonly string[],
  count: number,
  unassignedCount: number,
): boolean {
  if (unassignedCount > 0) return false
  for (let i = 0; i < count; i++) {
    if (!assignments[i]?.length) return false
    if (!names[i]?.trim()) return false
  }
  return true
}
