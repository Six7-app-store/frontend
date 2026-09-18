/**
 * Deployment lifecycle rules for the detail page: which actions a status
 * allows, when a deployment counts as busy, and how to read the outcome
 * once a lifecycle task's live stream has ended. Pure functions — the
 * owner/member gating and all side effects stay with the caller.
 */
import type { Task, TaskType } from '@/types'
import { isLiveTaskStatus } from '@/services/deployment-tasks.service'

export type PauseResumeAction = 'pause' | 'resume'

// Lifecycle action gating — the action bar exposes Delete plus a
// dynamic Pause/Resume button. The backend picks the right Delete
// behaviour (terraform destroy + soft-delete vs. straight soft-delete)
// based on status, so the frontend just surfaces availability.
// Mirrors backend/app/services/lifecycle.py:
//   * success                 → Delete (dispatches Destroy), Pause
//   * paused                  → Delete (dispatches Destroy), Resume
//   * pause_failed            → Delete, Pause-Retry, Resume
//   * resume_failed           → Delete, Resume-Retry, Pause
//   * failed                  → Delete (Destroy or soft-delete)
//   * cancelled               → Delete (soft-delete)
//   * pending / running / destroying / pausing / resuming → 409, all disabled
//
// Members can never act on lifecycle; the action-bar hides the
// buttons entirely for them rather than rendering permanently-disabled
// controls (that gating is the caller's job).
export const DELETE_STATUSES = [
  'success', 'failed', 'cancelled', 'paused', 'pause_failed', 'resume_failed',
]

/** Tooltip of the disabled Delete button. */
export const DELETE_DISABLED_REASON = `Delete available when status is ${DELETE_STATUSES.join(', ')}`

export function canDeleteDeployment(status: string | undefined): boolean {
  return DELETE_STATUSES.includes(status ?? '')
}

// One Pause/Resume button — what it does depends on status. Most
// common case: ``success`` → Pause; ``paused`` → Resume. Failure
// states (pause_failed / resume_failed) also expose a retry that
// matches what just broke. Anything else hides it entirely.
export function canPauseDeployment(status: string | undefined): boolean {
  return status === 'success' || status === 'pause_failed' || status === 'resume_failed'
}

export function canResumeDeployment(status: string | undefined): boolean {
  return status === 'paused' || status === 'pause_failed' || status === 'resume_failed'
}

export function pauseResumeActionFor(status: string | undefined): PauseResumeAction | null {
  // Prefer the action that matches the steady-state semantic of
  // the current status: from ``success`` we pause, from ``paused``
  // we resume. From the failure states we pick the retry that
  // matches what just broke.
  if (status === 'success' || status === 'pause_failed') return 'pause'
  if (status === 'paused' || status === 'resume_failed') return 'resume'
  return null
}

export interface DeploymentBusySource {
  deploymentStatus: string | undefined
  activeTaskStatus: string | undefined
  latestTaskStatus: string | undefined
}

// True while the deployment (or its active task) is still moving. The
// resend-access button reads this to stay disabled until the run is
// terminal — otherwise an operator could mail credentials before the
// VMs/services they point at are reachable.
export function isDeploymentBusy(source: DeploymentBusySource): boolean {
  if (isLiveTaskStatus(source.deploymentStatus)) return true
  if (isLiveTaskStatus(source.activeTaskStatus)) return true
  // Members never load the task list (so there is no active task),
  // but a redeploy/pause/resume can still be in flight while the
  // deployment row reads "success". Fall back to the latest_task
  // status from the detail response, which is populated regardless
  // of role, so the member's resend button stays disabled until the
  // run is terminal.
  return isLiveTaskStatus(source.latestTaskStatus)
}

/** What the page should report once the live stream has ended. */
export type StreamEndOutcome = 'gone' | 'destroy_failed' | 'pause_failed' | 'resume_failed' | null

export interface StreamEndSource {
  /** Deployment no longer loadable after the refetch (see :func:`isDeploymentGone`). */
  gone: boolean
  /** The active task before the refetch was a DESTROY. */
  wasDestroy: boolean
  /** Newest task after the refetch. */
  newestTask: Task | undefined
  /** Snapshot of the active task taken before the refetch. */
  lastActiveType: TaskType | undefined
  lastActiveStatus: string | undefined
}

/**
 * The deployment row only disappears when destroy actually succeeded (the
 * celery listener auto-soft-deletes on ``task-succeeded`` of a DESTROY task).
 * A failed destroy leaves the row so the user can read the logs.
 */
export function isDeploymentGone(current: { deploymentId: string } | null, deploymentId: string): boolean {
  return !current || current.deploymentId !== deploymentId
}

export function resolveStreamEndOutcome(source: StreamEndSource): StreamEndOutcome {
  // Soft-deleted upstream — the destroy ran clean.
  if (source.gone) return 'gone'

  // Destroy attempted but the row still exists → it failed.
  if (source.wasDestroy) return 'destroy_failed'

  // Pause/Resume failed asynchronously. ``activeTask`` is no longer set, so
  // look at the newest task.
  const newestTask = source.newestTask
  const failedKind = (newestTask?.type === 'pause' || newestTask?.type === 'resume')
    && newestTask.status === 'failed'
    ? newestTask.type
    : null
  // Belt-and-braces: even if loadTasks() raced, the snapshot from
  // before the await should still tell us what was active.
  const fallbackKind = (source.lastActiveType === 'pause' || source.lastActiveType === 'resume')
    && source.lastActiveStatus === 'failed'
    ? source.lastActiveType
    : null
  const kind = failedKind || fallbackKind
  if (kind === 'pause') return 'pause_failed'
  if (kind === 'resume') return 'resume_failed'
  return null
}
