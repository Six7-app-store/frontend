/**
 * Phase-stepper logic for the live progress card on the deployment detail
 * page. Pure functions over the SSE stream values and the active task —
 * no Vue, no I/O.
 *
 * - :func:`phaseLabel` — ``TERRAFORM_APPLY`` / ``PACKER_BUILD:db`` → display label.
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
// Default to a conservative 11-dot view before the first event arrives so the
// layout doesn't jump when the worker reports its real phase count.
export const DEFAULT_PHASE_COUNT = 11

const PHASE_LABELS_DEPLOY_FULL = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'PACKER_INIT',
  'PACKER_VALIDATE',
  'PACKER_BUILD',
  'TERRAFORM_INIT',
  'TERRAFORM_PLAN',
  'TERRAFORM_APPLY',
  'OUTPUTS_AND_CLEANUP',
] as const

const PHASE_LABELS_DEPLOY_NO_PACKER = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TERRAFORM_INIT',
  'TERRAFORM_PLAN',
  'TERRAFORM_APPLY',
  'OUTPUTS_AND_CLEANUP',
] as const

const PHASE_LABELS_DESTROY = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TERRAFORM_INIT',
  'TERRAFORM_DESTROY',
  'CLEANUP',
] as const

// Pause/Resume share the destroy preamble (clone + clouds + tf init to allow a
// state-pull) but their hot phase is a CLI-driven server stop/start, not a
// terraform destroy. Same length as ``PHASE_LABELS_DESTROY`` (7), so tables are
// picked by task type first and only fall back to length-matching when the type
// is unknown (e.g. live-stream attached before tasks were loaded).
const PHASE_LABELS_PAUSE = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TERRAFORM_INIT',
  'SERVER_STOP',
  'CLEANUP',
] as const

const PHASE_LABELS_RESUME = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TERRAFORM_INIT',
  'SERVER_START',
  'CLEANUP',
] as const

// Per-VM redeploy reuses the destroy preamble (clone, clouds.yaml,
// init) and then runs ``terraform apply -replace=… -target=…`` for
// the single targeted resource. Phase shape mirrors
// ``worker/app/tasks.py:_PHASES_REDEPLOY``.
const PHASE_LABELS_REDEPLOY = [
  'STARTING',
  'OPENSTACK_SETUP',
  'GIT_CLONE',
  'CREDS_MATERIALISE',
  'TERRAFORM_INIT',
  'TERRAFORM_APPLY',
  'CLEANUP',
] as const

// Stepper labels: the worker sends the full phase sequence as ``phase_names``
// with every progress event — the authoritative source, since multi-image
// deploys have a dynamic sequence whose template keys the frontend can't guess.
// Before the first progress event, we fall back to the static tables above,
// which cover the fixed shapes (single-image deploy / destroy / pause / resume
// / redeploy); multi-image slots show generic numbers until ``phase_names`` lands.

// Pretty phase label for the progress bar header. Keeps the enum
// naming convention from the worker (UPPER_SNAKE_CASE) but renders
// it human-friendly. Defensive: anything that isn't a non-empty
// string falls back to an empty label so the template never sees a
// non-string slip through (e.g. the brief moment an unwrapped ref
// produced the original ``phase.split is not a function`` crash).
export function phaseLabel(phase: unknown): string {
  if (typeof phase !== 'string' || !phase) return ''
  // Worker-emitted multi-image phases carry the template key as a ``:<key>``
  // suffix (e.g. ``PACKER_BUILD:database``). Split the suffix off, title-case
  // the base name, and append the sub-key as ``[<key>]`` so the stepper reads
  // ``Packer Build [database]`` instead of ``Packer Build:database``.
  const colonIdx = phase.indexOf(':')
  const base = colonIdx === -1 ? phase : phase.slice(0, colonIdx)
  const subKey = colonIdx === -1 ? '' : phase.slice(colonIdx + 1).trim()
  const formattedBase = base
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
  return subKey ? `${formattedBase} [${subKey}]` : formattedBase
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
//      pause / resume / redeploy). Contains the exact phase names
//      including ``:<template_key>`` suffixes for multi-image builds.
//   2. Static table picked by ``activeTask.type`` — used in the brief
//      window between page-load and the first progress event, and
//      always for legacy Single-Image-Deploy where the worker's
//      sequence is byte-identical to ``PHASE_LABELS_DEPLOY_FULL``.
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
  } else if (activeType === 'deploy') {
    // Without the worker's ``phase_names`` we can't tell legacy
    // (11) apart from multi-image (14, 17, ...). The total is
    // already known from the stream though, so pick the matching
    // table when it fits exactly — otherwise leave ``table = null``
    // and let the loop fall through to numeric slot indices.
    // Once the first progress event arrives, ``phase_names`` takes
    // over and the predicted slots are replaced with real labels.
    if (source.totalPhases === PHASE_LABELS_DEPLOY_NO_PACKER.length) {
      table = PHASE_LABELS_DEPLOY_NO_PACKER
    } else if (source.totalPhases === PHASE_LABELS_DEPLOY_FULL.length) {
      table = PHASE_LABELS_DEPLOY_FULL
    }
  }
  // Length-based last resort (no active task type known yet).
  if (!table) {
    const total = source.totalPhases
    if (total === PHASE_LABELS_DEPLOY_FULL.length) table = PHASE_LABELS_DEPLOY_FULL
    else if (total === PHASE_LABELS_DEPLOY_NO_PACKER.length) table = PHASE_LABELS_DEPLOY_NO_PACKER
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
