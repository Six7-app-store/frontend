import { describe, it, expect } from 'vitest'

import {
  effectiveVariableScope,
  isMultiImagePackerLayout,
} from '@/services/deployment-variables.service'
import type { AppVariable } from '@/types'

describe('isMultiImagePackerLayout', () => {
  it('detects packer values nested per template key', () => {
    expect(isMultiImagePackerLayout({ packer: { web: { size: 1 }, db: {} } })).toBe(true)
  })

  it.each([
    [undefined],
    [null],
    [{}],
    [{ packer: 'flat' }],
    [{ packer: [] }],
    [{ packer: {} }],
    [{ packer: { web: { size: 1 }, flat: 'x' } }],
    [{ packer: { web: [] } }],
    [{ packer: { web: null } }],
  ])('treats %j as the flat layout', (variables) => {
    expect(isMultiImagePackerLayout(variables)).toBe(false)
  })
})

describe('effectiveVariableScope', () => {
  it.each([
    [{ varScope: 'team', osScope: 'user' }, 'team'],
    [{ osScope: 'user' }, 'user'],
    // An explicit ``varScope`` wins, even when it is ``all``.
    [{ varScope: 'all', osScope: 'team' }, 'all'],
    [{}, 'all'],
  ])('resolves %j to %s', (variable, expected) => {
    expect(effectiveVariableScope(variable as AppVariable)).toBe(expected)
  })
})
