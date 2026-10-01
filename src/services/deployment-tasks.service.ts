/**
 * Task-list helpers for the deployment detail page: ordering, the
 * "active" task and the history list. Pure functions — no Vue, no I/O.
 */
import type { Task } from '@/types'

/** ``pending`` / ``running`` — states we still expect progress events for. */
export function isLiveTaskStatus(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'running'
}

/** Copy of ``tasks`` sorted newest first by ``created_at`` (ISO strings). */
export function sortTasksNewestFirst(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function findActiveTask(tasks: Task[]): Task | null {
  if (!tasks.length) return null
  // The "active" task is the one we still expect events from.
  // Fall back to the latest task by created_at if all are terminal —
  // its progress columns may still be useful for context.
  const sorted = sortTasksNewestFirst(tasks)
  return sorted.find((t) => isLiveTaskStatus(t.status)) ?? sorted[0] ?? null
}

// Tasks that aren't the currently running one. Shown as the history
// list below the active-task card so the running task isn't rendered
// twice (once in the live block, once in the static list). Only
// filtered while the stream is relevant, i.e. while the active card
// is actually on screen.
export function selectHistoryTasks(tasks: Task[], activeTask: Task | null, streamRelevant: boolean): Task[] {
  const list = sortTasksNewestFirst(tasks)
  if (!activeTask || !streamRelevant) return list
  return list.filter((t) => t.taskId !== activeTask.taskId)
}
