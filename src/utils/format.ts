/**
 * Shared date formatting helpers.
 *
 * Consolidates the ``de-DE`` date formatting used across several views. Two
 * shapes are exposed:
 *
 * - :func:`formatDate` — date only (``dd.mm.yyyy``), for list/detail views.
 * - :func:`formatDateTime` — date + time, where the exact timestamp matters.
 *
 * Both tolerate ``null``/empty input and unparseable strings. :func:`formatDate`
 * returns the input verbatim when it can't be parsed; :func:`formatDateTime`
 * yields ``'-'`` for empty input.
 */

const LOCALE = 'de-DE'

/**
 * Date only (``dd.mm.yyyy``). Accepts a ``Date`` or a string; returns the
 * input verbatim when it is not a parseable date, matching the previous
 * per-view helpers.
 */
export function formatDate(value?: string | Date | null): string {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? String(value) : value.toLocaleDateString(LOCALE)
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toLocaleDateString(LOCALE)
  }
  return value as string
}

/** Date + time (``dd.mm.yyyy, hh:mm:ss``). Empty → ``'-'``. */
export function formatDateTime(
  value?: string | number | Date | null,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  },
): string {
  if (value === null || value === undefined || value === '') return '-'
  return new Date(value).toLocaleString(LOCALE, options)
}

/**
 * Human-readable byte size (``B`` / ``KB`` / ``MB`` / ``GB``). Bytes under
 * 1 KiB show as whole bytes, KiB values are rounded to a whole number, MiB and
 * GiB values keep one decimal. Consolidates the per-component byte formatters.
 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}

