/**
 * Shared date formatting helpers.
 *
 * Dates follow the UI language the user picked (German ``dd.mm.yyyy``,
 * English ``dd/mm/yyyy``). Two shapes are exposed:
 *
 * - :func:`formatDate` — date only (``dd.mm.yyyy``), for list/detail views.
 * - :func:`formatDateTime` — date + time, where the exact timestamp matters.
 *
 * Both tolerate ``null``/empty input and unparseable strings. :func:`formatDate`
 * returns the input verbatim when it can't be parsed; :func:`formatDateTime`
 * yields ``'-'`` for empty input.
 */

import { LOCALE_STORAGE_KEY } from '@/utils/storage-keys'

// UI language → date locale. English uses the British day-first order, which
// reads the same way as the German one.
const DATE_LOCALES: Record<string, string> = { de: 'de-DE', en: 'en-GB' }

// The language the user picked (AppLayout stores it on every switch). Read
// from storage rather than from the i18n instance, so this module stays free
// of vue-i18n and works under specs that mock it.
const dateLocale = (): string => {
  let lang: string | null = null
  try {
    lang = localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    // Storage blocked: fall back to German, the app's default language.
  }
  return DATE_LOCALES[lang ?? 'de'] ?? 'de-DE'
}

/**
 * Date only (``dd.mm.yyyy``). Accepts a ``Date`` or a string; returns the
 * input verbatim when it is not a parseable date, matching the previous
 * per-view helpers.
 */
export function formatDate(value?: string | Date | null): string {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? String(value) : value.toLocaleDateString(dateLocale())
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toLocaleDateString(dateLocale())
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
  return new Date(value).toLocaleString(dateLocale(), options)
}

/**
 * Human-readable byte size (``B`` / ``KB`` / ``MB`` / ``GB``). Bytes under
 * 1 KiB show as whole bytes, KiB values are rounded to a whole number, MiB and
 * GiB values keep one decimal. Consolidates the per-component byte formatters.
 */
/**
 * A size given in MiB, such as a flavor's RAM: ``MB`` below 1 GiB, else
 * ``GB`` with at most one decimal (``1.5 GB``, ``2 GB``). Empty → ``0 MB``.
 */
export function formatMegabytes(mb: number | undefined | null): string {
  if (!mb) return '0 MB'
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}

