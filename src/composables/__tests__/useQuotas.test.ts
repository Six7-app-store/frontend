import { describe, it, expect } from 'vitest'

import { useQuotas } from '@/composables/useQuotas'

const { getColorClass, getTextColorClass, isQuotaCritical } = useQuotas()

// One scale for bar, text and warning icon (see QUOTA_THRESHOLDS).
describe('Quota-Schwellen', () => {
  it.each([
    [0, 'bg-green-500'],
    [49, 'bg-green-500'],
    [50, 'bg-yellow-500'],
    [74, 'bg-yellow-500'],
    [75, 'bg-orange-500'],
    [89, 'bg-orange-500'],
    [90, 'bg-red-500'],
    [100, 'bg-red-500'],
  ])('färbt den Balken bei %s%% %s', (percentage, expected) => {
    expect(getColorClass(percentage)).toBe(expected)
  })

  it.each([
    [0, 'text-gray-600'],
    [74, 'text-gray-600'],
    [75, 'text-amber-500'],
    [89, 'text-amber-500'],
    [90, 'text-red-500'],
  ])('färbt den Text bei %s%% %s', (percentage, expected) => {
    expect(getTextColorClass(percentage)).toBe(expected)
  })

  it.each([
    [89, false],
    [90, true],
    [100, true],
  ])('meldet %s%% als kritisch: %s', (percentage, expected) => {
    expect(isQuotaCritical(percentage)).toBe(expected)
  })
})
