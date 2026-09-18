/**
 * Helpers for interpreting a task's persisted ``logs`` and ``tf_state``
 * on the deployment detail page.
 *
 * - :func:`countLogEntries` — entry count for the Logs card badge.
 * - :func:`splitTaskLogs` — friendly failure headline + technical details.
 * - :func:`countTfResources` — managed-resource count of a terraform state.
 */
import type { Task } from '@/types'

// Count of log entries inside a task's ``logs`` for the badge in
// the Logs card header. Logs arrive in three flavours:
//
//  * an object ``{logs: [...], error?: ...}`` — the Failure payload
//    serialised by the worker on a failed deploy
//  * a plain array on the success path (the success result is just
//    ``logs: list[dict]``)
//  * a JSON string when the API serialises one of the above as text
//
// The helper handles all three so the "N entries" pill stays
// accurate regardless of the wire shape; returns null when the count
// can't be determined (e.g. logs is a non-JSON string), in which case
// the badge is hidden.
export function countLogEntries(raw: Task['logs'] | undefined): number | null {
  if (raw == null) return null
  let value: unknown = raw
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        value = JSON.parse(trimmed)
      } catch {
        return null
      }
    } else {
      return null
    }
  }
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    const inner = (value as Record<string, unknown>).logs
    if (Array.isArray(inner)) return inner.length
  }
  return null
}

/**
 * Split a task-logs string into a friendly headline + a collapsible
 * technical-details body. The backend's ``celery_event_listener.py``
 * emits Celery-infrastructure failures (``NotRegistered``,
 * ``WorkerLostError``, …) in a stable two-section format separated
 * by ``--- Technische Details ---``; we honour that boundary so the
 * raw stack trace stays available but isn't shoved into the user's
 * face by default.
 *
 * Returns ``{headline, details, isFailure}`` — ``isFailure`` lets
 * the template pick the destructive palette without re-doing the
 * regex on render.
 */
export const FAILURE_DETAIL_DIVIDER = '--- Technische Details ---'

export function splitTaskLogs(raw: string | Record<string, unknown> | null | undefined) {
  if (!raw) return { headline: '', details: '', isFailure: false }
  const text = String(raw)
  // Backend "infra" failure with the explicit divider — we get a
  // one-line headline and a raw block underneath.
  const dividerIdx = text.indexOf(FAILURE_DETAIL_DIVIDER)
  if (dividerIdx >= 0) {
    return {
      headline: text.slice(0, dividerIdx).trim(),
      details: text.slice(dividerIdx + FAILURE_DETAIL_DIVIDER.length).trim(),
      isFailure: true,
    }
  }
  // Fallback: the legacy ``Task failed: ...\n<traceback>`` shape.
  // Take the first line as headline if the body is multi-line.
  if (text.startsWith('Task failed:')) {
    const newlineIdx = text.indexOf('\n')
    if (newlineIdx > 0) {
      return {
        headline: text.slice(0, newlineIdx).trim(),
        details: text.slice(newlineIdx + 1).trim(),
        isFailure: true,
      }
    }
    return { headline: text.trim(), details: '', isFailure: true }
  }
  return { headline: '', details: '', isFailure: false }
}

// Counts the resources in the state for the header sub-headline.
export function countTfResources(state: Task['tf_state'] | undefined): number {
  if (!state) return 0

  try {
    const parsed = typeof state === 'string' ? JSON.parse(state) : state
    return parsed?.resources?.length || 0
  } catch {
    return 0
  }
}
