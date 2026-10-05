import { describe, it, expect } from 'vitest'

import {
  DEFAULT_PHASE_COUNT,
  phaseLabel,
  resolvePhaseStepCount,
  resolvePhaseStepLabel,
  resolveCurrentPhaseIndex,
  estimatePhaseIndexFromPercent,
  type PhaseStepLabelSource,
} from '@/services/deployment-phases.service'

const labels = (count: number, source: PhaseStepLabelSource) =>
  Array.from({ length: count }, (_, idx) => resolvePhaseStepLabel(idx, source))

describe('phaseLabel', () => {
  it('title-cases UPPER_SNAKE_CASE phase names', () => {
    expect(phaseLabel('OUTPUTS_AND_CLEANUP')).toBe('Outputs And Cleanup')
  })

  it('names the tool OpenTofu', () => {
    expect(phaseLabel('TOFU_APPLY')).toBe('OpenTofu Apply')
    expect(phaseLabel('TOFU_INIT')).toBe('OpenTofu Init')
  })

  it('returns an empty label for non-strings and empty strings', () => {
    expect(phaseLabel('')).toBe('')
    expect(phaseLabel(null)).toBe('')
    expect(phaseLabel({ value: 'X' })).toBe('')
  })
})

describe('resolvePhaseStepCount', () => {
  it('uses the live total when positive, otherwise the default', () => {
    expect(resolvePhaseStepCount(7)).toBe(7)
    expect(resolvePhaseStepCount(0)).toBe(DEFAULT_PHASE_COUNT)
    expect(DEFAULT_PHASE_COUNT).toBe(8)
  })
})

describe('resolvePhaseStepLabel', () => {
  it('prefers the worker phase names from the stream', () => {
    const source = { phaseNames: ['STARTING', 'GIT_CLONE'], activeTaskType: 'destroy' as const, totalPhases: 7 }
    expect(resolvePhaseStepLabel(1, source)).toBe('Git Clone')
    // Beyond the stream list the static table for the task type applies.
    expect(resolvePhaseStepLabel(5, source)).toBe('OpenTofu Destroy')
  })

  it.each([
    ['pause', 'Server Stop'],
    ['resume', 'Server Start'],
    ['destroy', 'OpenTofu Destroy'],
    ['redeploy', 'OpenTofu Apply'],
  ] as const)('picks the static table by task type (%s)', (type, fifth) => {
    expect(resolvePhaseStepLabel(5, { phaseNames: [], activeTaskType: type, totalPhases: 7 })).toBe(fifth)
  })

  it('picks the deploy table matching the live total', () => {
    expect(labels(8, { phaseNames: [], activeTaskType: 'deploy', totalPhases: 8 })[4]).toBe('OpenTofu Init')
    expect(labels(8, { phaseNames: [], activeTaskType: 'deploy', totalPhases: 8 })[6]).toBe('OpenTofu Apply')
  })

  it('falls back to length matching without a known type', () => {
    expect(resolvePhaseStepLabel(5, { phaseNames: [], activeTaskType: undefined, totalPhases: 8 })).toBe('OpenTofu Plan')
    expect(resolvePhaseStepLabel(5, { phaseNames: [], activeTaskType: undefined, totalPhases: 7 })).toBe('OpenTofu Destroy')
    // Deploy with an unknown total: length matching still applies (7 → destroy table).
    expect(resolvePhaseStepLabel(5, { phaseNames: [], activeTaskType: 'deploy', totalPhases: 7 })).toBe('OpenTofu Destroy')
  })

  it('uses 1-based numbers when no table fits', () => {
    expect(labels(3, { phaseNames: [], activeTaskType: 'deploy', totalPhases: 14 })).toEqual(['1', '2', '3'])
    expect(resolvePhaseStepLabel(13, { phaseNames: [], activeTaskType: 'deploy', totalPhases: 14 })).toBe('14')
    expect(resolvePhaseStepLabel(2, { phaseNames: [], activeTaskType: 'update', totalPhases: 3 })).toBe('3')
  })
})

describe('resolveCurrentPhaseIndex', () => {
  it('converts the 1-based stream index', () => {
    expect(resolveCurrentPhaseIndex({ phaseIndex: 3, progress: 90, stepCount: 11 })).toBe(2)
  })

  it('returns -1 before any progress', () => {
    expect(resolveCurrentPhaseIndex({ phaseIndex: null, progress: null, stepCount: 11 })).toBe(-1)
    expect(resolveCurrentPhaseIndex({ phaseIndex: 0, progress: null, stepCount: 11 })).toBe(-1)
  })

  it('derives the index from the clamped percentage', () => {
    expect(resolveCurrentPhaseIndex({ phaseIndex: null, progress: 45, stepCount: 11 })).toBe(4)
    expect(resolveCurrentPhaseIndex({ phaseIndex: null, progress: 0, stepCount: 11 })).toBe(0)
    expect(resolveCurrentPhaseIndex({ phaseIndex: null, progress: 150, stepCount: 11 })).toBe(10)
  })
})

describe('estimatePhaseIndexFromPercent', () => {
  it('rounds the percentage onto a 1-based index within the total', () => {
    expect(estimatePhaseIndexFromPercent(45, 11)).toBe(5)
    expect(estimatePhaseIndexFromPercent(0, 11)).toBe(1)
    expect(estimatePhaseIndexFromPercent(100, 7)).toBe(7)
  })

  it('uses the default total when none is known', () => {
    expect(estimatePhaseIndexFromPercent(100, 0)).toBe(DEFAULT_PHASE_COUNT)
  })
})
