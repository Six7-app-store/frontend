/** Utilisation below this percentage is "low" (green); from here on it is "mid" (yellow). */
export const METER_MID_FROM = 50

export type MeterLevel = 'low' | 'mid'

/** Keeps a percentage inside 0-100; anything that is not a number counts as 0. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function meterLevel(percent: number): MeterLevel {
  return clampPercent(percent) >= METER_MID_FROM ? 'mid' : 'low'
}
