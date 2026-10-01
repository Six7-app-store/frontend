import { describe, it, expect } from 'vitest'

import {
  effectiveVariableScope,
  variableScopeLabelKey,
  isMultiImagePackerLayout,
  storedPackerValue,
  templateKeyOf,
  variableDisplayDescription,
} from '@/services/deployment-variables.service'
import type { AppVariable } from '@/types'

describe('variableDisplayDescription', () => {
  it.each([
    ['Hauptnetzwerk @openstack:network:id', 'Hauptnetzwerk'],
    ['@openstack:security_group:id:list Build-Security-Groups (TCP 5986)', 'Build-Security-Groups (TCP 5986)'],
    ['Obergrenze  gleichzeitiger VMs @platform:limit', 'Obergrenze gleichzeitiger VMs'],
    ['Ohne Marker', 'Ohne Marker'],
    ['@openstack:flavor:name', ''],
    [undefined, ''],
  ])('macht aus %j den Text %j', (raw, shown) => {
    expect(variableDisplayDescription(raw)).toBe(shown)
  })
})

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

describe('templateKeyOf', () => {
  it('uses the template key, default for single-image apps', () => {
    expect(templateKeyOf({ name: 'x', template_key: 'web' } as AppVariable)).toBe('web')
    expect(templateKeyOf({ name: 'x' } as AppVariable)).toBe('default')
  })
})

describe('storedPackerValue', () => {
  const size = { name: 'size', source: 'packer', template_key: 'web' } as AppVariable

  it('reads the nested slot in the multi-image layout', () => {
    expect(storedPackerValue({ packer: { web: { size: 's' } } }, size, true)).toBe('s')
  })

  it('falls back to the flat value when the nested slot is missing', () => {
    expect(storedPackerValue({ size: 'm', packer: { db: {} } }, size, true)).toBe('m')
  })

  it('reads flat in the single-image layout, even if a packer key exists', () => {
    expect(storedPackerValue({ size: 'm', packer: { web: { size: 's' } } }, size, false)).toBe('m')
  })

  it('is undefined when nothing is stored', () => {
    expect(storedPackerValue({}, size, true)).toBeUndefined()
    expect(storedPackerValue(null, size, false)).toBeUndefined()
  })
})

describe('variableScopeLabelKey', () => {
  it.each([
    ['team', 'deployment.variables.scopeBadgeTeam'],
    ['user', 'deployment.variables.scopeBadgeUser'],
    ['all', null],
    [undefined, null],
  ] as const)('liefert für %s den Badge-Text %s', (scope, key) => {
    expect(variableScopeLabelKey(scope)).toBe(key)
  })
})
