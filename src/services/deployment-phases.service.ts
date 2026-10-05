/**
 * Phase-stepper logic for the live progress card on the deployment detail
 * page. Pure functions over the SSE stream values and the active task —
 * no Vue, no I/O.
 *
 * - :func:`phaseLabel` — ``TOFU_APPLY`` → display label.
 * - :func:`resolvePhaseStepCount` / :func:`resolvePhaseStepLabel` — stepper dots.
 * - :func:`resolveCurrentPhaseIndex` — 0-based index of the active dot.
 * - :func:`estimatePhaseIndexFromPercent` — 1-based seed index from the DB.
 */
import type { TaskType } from '@/types'

// Phase stepper — N dots based on the live ``totalPhases`` reported by the
// worker. Phase names live in the worker (different sets for deploy/destroy),
// so the frontend stays task-type-agnostic for the dot count. Label tables for
// the deploy/destroy presets render meaningful labels under each dot when the
// totals match a known shape; an unknown count falls back to numbered labels.
//
// Default to the deploy shape (8 dots) before the first event arrives so the
// layout doesn't jump when the worker reports its real phase count.
export const DEFAULT_PHASE_COUNT = 8

// Mirrors ``worker/app/tasks.py:_PHASES_DEPLOY``.
const PHASE_LABELS_DEPLOY = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TOFU_INIT',
  'TOFU_PLAN',
  'TOFU_APPLY',
  'OUTPUTS_AND_CLEANUP',
] as const

const PHASE_LABELS_DESTROY = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TOFU_INIT',
  'TOFU_DESTROY',
  'CLEANUP',
] as const

// Pause/Resume share the destroy preamble (clone + clouds + tofu init to allow a
// state-pull) but their hot phase is a CLI-driven server stop/start, not a
// tofu destroy. Same length as ``PHASE_LABELS_DESTROY`` (7), so tables are
// picked by task type first and only fall back to length-matching when the type
// is unknown (e.g. live-stream attached before tasks were loaded).
const PHASE_LABELS_PAUSE = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TOFU_INIT',
  'SERVER_STOP',
  'CLEANUP',
] as const

const PHASE_LABELS_RESUME = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TOFU_INIT',
  'SERVER_START',
  'CLEANUP',
] as const

// Per-VM redeploy reuses the destroy preamble (clone, clouds.yaml,
// init) and then runs ``tofu apply -replace=… -target=…`` for
// the single targeted resource. Phase shape mirrors
// ``worker/app/tasks.py:_PHASES_REDEPLOY``.
const PHASE_LABELS_REDEPLOY = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TOFU_INIT',
  'TOFU_APPLY',
  'CLEANUP',
] as const

// Stepper labels: the worker sends the full phase sequence as ``phase_names``
// with every progress event — the authoritative source. Before the first
// progress event, we fall back to the static tables above.

// Pretty phase label for the progress bar header. Keeps the enum
// naming convention from the worker (UPPER_SNAKE_CASE) but renders
// it human-friendly; ``TOFU`` reads as the tool's name, ``OpenTofu``.
// Defensive: anything that isn't a non-empty string falls back to an
// empty label so the template never sees a non-string slip through
// (e.g. the brief moment an unwrapped ref produced the original
// ``phase.split is not a function`` crash).
export function phaseLabel(phase: unknown): string {
  if (typeof phase !== 'string' || !phase) return ''
  return phase
    .split('_')
    .map((w) => (w === 'TOFU' ? 'OpenTofu' : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(' ')
}

/** Number of stepper dots: the live total, or the default before the first event. */
export function resolvePhaseStepCount(totalPhases: number): number {
  return totalPhases > 0 ? totalPhases : DEFAULT_PHASE_COUNT
}

export interface PhaseStepLabelSource {
  /** Worker-authoritative phase sequence from the stream (may be empty). */
  phaseNames: string[]
  /** Type of the active task, if known. */
  activeTaskType: TaskType | undefined
  /** Last total phase count reported by the stream. */
  totalPhases: number
}

// Return the label for a given 0-based index. Order of precedence:
//   1. ``phaseNames`` (stream) — authoritative, ships from the worker on
//      every progress event for every real task (deploy / destroy /
//      pause / resume / redeploy).
//   2. Static table picked by ``activeTask.type`` — used in the brief
//      window between page-load and the first progress event.
//   3. Numeric slot index — empty-slot guard so the stepper height
//      doesn't collapse during the loading flicker.
export function resolvePhaseStepLabel(idx: number, source: PhaseStepLabelSource): string {
  // 1. Worker-authoritative list.
  const fromStream = source.phaseNames
  if (Array.isArray(fromStream) && idx >= 0 && idx < fromStream.length) {
    return phaseLabel(fromStream[idx])
  }

  // 2. Static fallback by active task type. Used until the first
  //    progress event lands.
  let table: readonly string[] | null = null
  const activeType = source.activeTaskType
  if (activeType === 'pause') {
    table = PHASE_LABELS_PAUSE
  } else if (activeType === 'resume') {
    table = PHASE_LABELS_RESUME
  } else if (activeType === 'destroy') {
    table = PHASE_LABELS_DESTROY
  } else if (activeType === 'redeploy') {
    table = PHASE_LABELS_REDEPLOY
  } else if (activeType === 'deploy' && source.totalPhases === PHASE_LABELS_DEPLOY.length) {
    // Only when the live total fits; otherwise length matching below or
    // numbered slots, until ``phase_names`` arrives.
    table = PHASE_LABELS_DEPLOY
  }
  // Length-based last resort (no active task type known yet).
  if (!table) {
    const total = source.totalPhases
    if (total === PHASE_LABELS_DEPLOY.length) table = PHASE_LABELS_DEPLOY
    else if (total === PHASE_LABELS_DESTROY.length) table = PHASE_LABELS_DESTROY
  }
  if (table && idx >= 0 && idx < table.length) {
    return phaseLabel(table[idx])
  }
  // 3. Numeric placeholder so the slot has a non-empty label.
  return String(idx + 1)
}

export interface CurrentPhaseIndexSource {
  /** 1-based ``phase_index`` from the stream, ``null`` before the first event. */
  phaseIndex: number | null
  /** ``progress_pct`` from the stream, ``null`` before the first event. */
  progress: number | null
  /** Number of stepper dots (see :func:`resolvePhaseStepCount`). */
  stepCount: number
}

// 0-based index of the active dot. Prefer the worker's authoritative
// ``phase_index`` (1-based) from the SSE payload — only fall back to
// rounding ``progress_pct`` if no progress event has arrived yet.
export function resolveCurrentPhaseIndex(source: CurrentPhaseIndexSource): number {
  if (source.phaseIndex !== null && source.phaseIndex > 0) {
    return source.phaseIndex - 1
  }
  if (source.progress === null) return -1
  const total = source.stepCount
  const pct = Math.max(0, Math.min(100, source.progress))
  return Math.max(0, Math.min(total - 1, Math.round((pct / 100) * total) - 1))
}

// Approximate the phase index from the persisted percent so the
// stepper renders meaningfully before the first SSE progress event
// lands, mirroring the worker's own round(idx/total*100) math.
// Returns the 1-based index the stream would report.
export function estimatePhaseIndexFromPercent(progressPct: number, totalPhases: number): number {
  const total = totalPhases || DEFAULT_PHASE_COUNT
  return Math.max(
    1,
    Math.min(total, Math.round((progressPct / 100) * total)),
  )
}
