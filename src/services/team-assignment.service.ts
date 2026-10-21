/**
 * Rules of the wizard's team-assignment step: who sits in which team, and
 * when the step is complete. Pure functions — no Vue, no I/O. ``assignments``
 * holds one list of student IDs per team, in team order.
 */
import type { DeploymentDraft, GroupMode } from '@/types'
import { teamLists } from '@/services/deployment-draft.service'

/**
 * The split the wizard preselects and marks "Empfohlen für diese App".
 *
 * A file variable's scope (all/team/user) only says how files are routed,
 * not how people should work: a per-person task file fits one shared
 * environment just as well. So the scope implies no split, and without a
 * split the app itself recommends (there is no such field yet), it is
 * "Alle zusammen" for every app.
 */
export const RECOMMENDED_MODE: GroupMode = 'one'

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
 * Why a self-formed split (``custom``) cannot be deployed yet, as an i18n
 * key, or ``null``. The other modes form their teams themselves and are
 * always complete.
 */
export function splitProblem(draft: DeploymentDraft): string | null {
  if (draft.groupMode !== 'custom') return null
  const count = Math.max(draft.groupCount || 1, 1)
  const assignments = teamLists(draft.assignments, count)
  if (unassignedIds(draft.studentIds, assignments).length > 0) return 'deployment.wizard.block.unassigned'
  for (let i = 0; i < count; i++) {
    if (assignments[i]!.length === 0) return 'deployment.wizard.block.emptyTeam'
    if (!draft.groupNames?.[i]?.trim()) return 'deployment.wizard.block.unnamedTeam'
  }
  return null
}

/**
 * What a split leads to, as an i18n key with its count: ``one`` is one
 * environment for everybody, ``eachUser`` one per person, ``custom`` one per
 * group once groups are being formed. ``null`` without people.
 */
export function splitResult(
  mode: GroupMode,
  people: number,
  customCount: number | null,
): { key: string; n: number } | null {
  if (people === 0) return null
  if (mode === 'one') return { key: 'deployment.wizard.split.resultOne', n: people }
  if (mode === 'eachUser') return { key: 'deployment.wizard.split.resultMany', n: people }
  return customCount === null
    ? { key: 'deployment.wizard.split.resultCustom', n: 0 }
    : { key: 'deployment.wizard.split.resultMany', n: customCount }
}
