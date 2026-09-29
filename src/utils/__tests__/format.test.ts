import { afterEach, describe, it, expect } from 'vitest'
import { formatBytes, formatDate, formatDateTime, formatMegabytes } from '@/utils/format'
import { LOCALE_STORAGE_KEY } from '@/utils/storage-keys'

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [1536, '2 KB'],
    [2.5 * 1024 ** 2, '2.5 MB'],
    [1024 ** 3 - 1, '1024.0 MB'],
    [1024 ** 3, '1.0 GB'],
    [2.25 * 1024 ** 3, '2.3 GB'],
  ])('%d bytes → %s', (n, expected) => {
    expect(formatBytes(n)).toBe(expected)
  })
})

describe('date locale', () => {
  const at = new Date(2026, 5, 8, 13, 0, 0)

  afterEach(() => localStorage.removeItem(LOCALE_STORAGE_KEY))

  it('is German by default', () => {
    expect(formatDate(at)).toBe('8.6.2026')
  })

  it('follows the language the user picked', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(formatDate(at)).toBe('08/06/2026')
    expect(formatDateTime(at)).toBe('08/06/2026, 13:00:00')
  })
})

describe('formatMegabytes', () => {
  it('uses MB below one GB and GB with at most one decimal above', () => {
    expect(formatMegabytes(0)).toBe('0 MB')
    expect(formatMegabytes(null)).toBe('0 MB')
    expect(formatMegabytes(512)).toBe('512 MB')
    expect(formatMegabytes(2048)).toBe('2 GB')
    expect(formatMegabytes(1536)).toBe('1.5 GB')
  })
})
