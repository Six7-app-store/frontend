import { describe, it, expect } from 'vitest'
import { lifecyclePillClass } from '@/composables/useVmPresentation'

describe('lifecyclePillClass', () => {
  it.each([
    ['ACTIVE', 'status-success'],
    ['ERROR', 'status-danger'],
    ['BUILD', 'status-warning'],
    ['REBUILD', 'status-warning'],
    ['SHUTOFF', 'status-neutral'],
    ['PAUSED', 'status-neutral'],
    [null, 'status-neutral'],
    [undefined, 'status-neutral'],
  ])('%s → %s', (status, expected) => {
    expect(lifecyclePillClass(status)).toBe(expected)
  })
})
