import { describe, it, expect } from 'vitest'

import {
  effectiveVariableScope,
  variableScopeLabelKey,
  variableDisplayDescription,
} from '@/services/deployment-variables.service'
import type { AppVariable } from '@/types'

describe('variableDisplayDescription', () => {
  it.each([
    ['Hauptnetzwerk @openstack:network:id', 'Hauptnetzwerk'],
    ['@openstack:security_group:id:list Build-Security-Groups (TCP 5986)', 'Build-Security-Groups (TCP 5986)'],
    ['Obergrenze  gleichzeitiger VMs', 'Obergrenze gleichzeitiger VMs'],
    ['Ohne Marker', 'Ohne Marker'],
    ['@openstack:flavor:name', ''],
    [undefined, ''],
  ])('macht aus %j den Text %j', (raw, shown) => {
    expect(variableDisplayDescription(raw)).toBe(shown)
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
