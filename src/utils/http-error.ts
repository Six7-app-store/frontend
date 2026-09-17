/**
 * HTTP/axios error helpers — the single place where the frontend reads
 * the shape of a failed request.
 *
 * The backend returns error detail in two shapes: a plain string, or a
 * structured object (e.g. ``{ reason, message }`` for a 412
 * PRECONDITION_FAILED). Plain interpolation would print
 * ``[object Object]`` for the dict case, so :func:`extractErrorMessage`
 * drills into ``.reason`` / ``.message`` when present and falls back to
 * ``err.message`` so a toast is always readable.
 *
 * The accessors (:func:`getErrorStatus`, :func:`getErrorDetail`,
 * :func:`getErrorReason`) return the raw values unchanged. Callers use
 * them instead of reaching into ``err.response`` directly, so every
 * error-handling site reads errors the same way (see the "Fehlerbehandlung"
 * section in the frontend README).
 */

interface HttpErrorLike {
  message?: string
  response?: {
    status?: number
    data?: { detail?: unknown }
  }
}

const asHttpError = (err: unknown): HttpErrorLike | undefined =>
  err !== null && typeof err === 'object' ? (err as HttpErrorLike) : undefined

/** HTTP status of a failed request (``err.response.status``), if any. */
export function getErrorStatus(err: unknown): number | undefined {
  return asHttpError(err)?.response?.status
}

/** Raw ``detail`` of the backend error body — a string, an object or ``undefined``. */
export function getErrorDetail(err: unknown): unknown {
  return asHttpError(err)?.response?.data?.detail
}

/** ``detail.reason`` of a structured backend error; ``undefined`` for string/missing detail. */
export function getErrorReason(err: unknown): string | undefined {
  const detail = getErrorDetail(err)
  if (detail === null || typeof detail !== 'object') return undefined
  return (detail as { reason?: string }).reason
}

/** Turn an axios-style error into a human-readable string. */
export function extractErrorMessage(err: any): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') {
    if (typeof detail.reason === 'string') return detail.reason
    if (typeof detail.message === 'string') return detail.message
  }
  return err?.message || 'Unknown error'
}
