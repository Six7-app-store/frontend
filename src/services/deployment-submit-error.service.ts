/**
 * The toast text after creating a deployment failed. Pure: the caller
 * passes its translate function.
 */
import { getErrorDetail } from '@/utils/http-error'

export type Translate = (key: string, params?: Record<string, unknown>) => string

/**
 * The backend reports file problems with 413/422 and a structured detail:
 * ``{ reason, variable, slot, filename?, limit_bytes?, actual_bytes?, allowed? }``.
 * Every known reason gets its own translated text with the numbers the user
 * needs; anything else shows the backend's string, the error message, or
 * the generic text.
 */
export function formatSubmitError(err: unknown, t: Translate): string {
  const detail = getErrorDetail(err) as Record<string, any> | string | undefined
  const fallback = (typeof detail === 'string' ? detail : null)
    ?? (err as { message?: string } | null)?.message
    ?? t('deployment.summary.submitError')

  if (!detail || typeof detail !== 'object' || !detail.reason) return fallback

  // Prefer the file name; older backends only send "<variable>/<slot>".
  const filename = String(
    detail.filename ?? (detail.variable && detail.slot ? `${detail.variable}/${detail.slot}` : ''),
  )
  // One decimal: "2.7 MB > 2 MB" helps, "2 MB > 2 MB" would confuse.
  const mb = (bytes: number) => (Number(bytes || 0) / (1024 * 1024)).toFixed(1)

  switch (detail.reason) {
    case 'file_too_large':
      return t('deployment.summary.errors.fileTooLarge', {
        filename, actualMb: mb(detail.actual_bytes), limitMb: mb(detail.limit_bytes),
      })
    case 'deployment_files_too_large':
      return t('deployment.summary.errors.deploymentFilesTooLarge', { limitMb: mb(detail.limit_bytes) })
    case 'file_extension_rejected':
      return t('deployment.summary.errors.fileExtensionRejected', {
        filename, allowed: Array.isArray(detail.allowed) ? detail.allowed.join(', ') : '',
      })
    case 'file_b64_invalid':
      return t('deployment.summary.errors.fileB64Invalid', { filename })
    case 'file_size_mismatch':
      return t('deployment.summary.errors.fileSizeMismatch', { filename })
    default:
      return fallback
  }
}
