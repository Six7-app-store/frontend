import { describe, it, expect } from 'vitest'

import {
  effectiveVariableScope,
  variableScopeLabelKey,
  variableDisplayDescription,
  variableLabel,
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

describe('variableLabel', () => {
  const v = (over: Partial<AppVariable>) => ({ name: 'vm_flavor', type: 'string', ...over }) as AppVariable

  it('nennt OpenStack-Ressourcen beim Klartext-Namen', () => {
    expect(variableLabel(v({ osType: 'flavor' }))).toEqual({ key: 'deployment.wizard.labels.flavor' })
  })

  it('nimmt sonst den ersten Satz der Beschreibung ohne Marker', () => {
    expect(variableLabel(v({ description: 'Anzahl der Kerne. Mehr kostet mehr. @openstack:scope:team' })))
      .toEqual({ text: 'Anzahl der Kerne' })
  })

  it('fällt bei langer oder fehlender Beschreibung auf den Namen mit Leerzeichen zurück', () => {
    expect(variableLabel(v({ description: 'x'.repeat(80) }))).toEqual({ text: 'Vm flavor' })
    expect(variableLabel(v({}))).toEqual({ text: 'Vm flavor' })
  })
})
