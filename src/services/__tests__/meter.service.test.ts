import { describe, it, expect } from 'vitest'

import { clampPercent, meterLevel, METER_MID_FROM } from '@/services/meter.service'

describe('meterLevel', () => {
  it.each([
    [0, 'low'],
    [13, 'low'],
    [49.9, 'low'],
    [METER_MID_FROM, 'mid'],
    [61, 'mid'],
    [100, 'mid'],
  ] as const)('stuft %s %% als %s ein', (percent, level) => {
    expect(meterLevel(percent)).toBe(level)
  })

  it('nimmt Werte außerhalb von 0-100 zurück in den Bereich', () => {
    expect(meterLevel(-20)).toBe('low')
    expect(meterLevel(180)).toBe('mid')
  })
})

describe('clampPercent', () => {
  it('begrenzt auf 0 bis 100', () => {
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(42)).toBe(42)
    expect(clampPercent(250)).toBe(100)
  })

  it('behandelt Nicht-Zahlen als 0', () => {
    expect(clampPercent(Number.NaN)).toBe(0)
    expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(0)
  })
})
