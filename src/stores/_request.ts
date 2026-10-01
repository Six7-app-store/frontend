/**
 * Shared helper for the option stores' request actions.
 *
 * Every store action follows the same shape: flip a loading flag, clear the
 * error, run an API call, map a failure to a fallback error message, and reset
 * the loading flag in a `finally` block. This helper captures that shape while
 * keeping the exact per-action semantics (loading transitions, error fallback
 * string, and whether the error is re-thrown) under the caller's control.
 */
import { getErrorDetail } from '@/utils/http-error'

export interface RequestContext {
  setLoading: (value: boolean) => void
  setError: (message: string | null) => void
}

export interface RunRequestOptions {
  /** When false, the caught error is swallowed instead of re-thrown. Defaults to true. */
  rethrow?: boolean
}

/**
 * Runs `fn`, mirroring the store actions' loading/error/finally behavior.
 *
 * - Sets loading to `true` and clears the error before running.
 * - On failure, stores the backend ``detail`` (``getErrorDetail``) or
 *   `fallbackMsg` as the error.
 * - Always resets loading to `false` in a `finally` block.
 * - Re-throws by default (return type `Promise<T>`); pass `{ rethrow: false }`
 *   to swallow the error, in which case the result may be `undefined`.
 */
export async function runRequest<T>(
  ctx: RequestContext,
  fn: () => Promise<T>,
  fallbackMsg: string,
): Promise<T>
export async function runRequest<T>(
  ctx: RequestContext,
  fn: () => Promise<T>,
  fallbackMsg: string,
  options: { rethrow: false },
): Promise<T | undefined>
export async function runRequest<T>(
  ctx: RequestContext,
  fn: () => Promise<T>,
  fallbackMsg: string,
  options: RunRequestOptions = {},
): Promise<T | undefined> {
  const { rethrow = true } = options
  ctx.setLoading(true)
  ctx.setError(null)

  try {
    return await fn()
  } catch (err) {
    ctx.setError((getErrorDetail(err) as string | undefined) || fallbackMsg)
    if (rethrow) {
      throw err
    }
    return undefined
  } finally {
    ctx.setLoading(false)
  }
}
