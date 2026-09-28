import { describe, it, expect } from 'vitest'
import { formatBytes } from '@/utils/format'

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
