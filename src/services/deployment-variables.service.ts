/**
 * Helpers for the deployment wizard's variable values (``draft.variables``).
 * Pure functions — no Vue, no I/O.
 */
import type { AppVariable } from '@/types'

/**
 * Scope of a variable: ``varScope`` wins, ``osScope`` (from an
 * ``@openstack:<type>:<scope>`` marker) is the fallback, ``all`` the default.
 * Scoped variables hold one value per slot (team or member), so the wizard
 * step and the summary must agree on this rule.
 */
export function effectiveVariableScope(variable: AppVariable): 'all' | 'team' | 'user' {
  return (variable.varScope || variable.osScope || 'all') as 'all' | 'team' | 'user'
}

/** i18n key of the scope badge on a variable card; ``null`` for ``all``, which needs no marker. */
export function variableScopeLabelKey(scope: 'all' | 'team' | 'user' | undefined): string | null {
  if (scope === 'team') return 'deployment.variables.scopeBadgeTeam'
  if (scope === 'user') return 'deployment.variables.scopeBadgeUser'
  return null
}

/**
 * A variable's description for people: without the ``@openstack:…`` and
 * ``@platform:…`` markers the platform reads from it.
 */
export function variableDisplayDescription(description: string | null | undefined): string {
  return (description ?? '')
    .replace(/@(?:openstack|platform):\S*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Packer template a variable belongs to; single-image apps use ``default``. */
export function templateKeyOf(variable: AppVariable): string {
  return variable.template_key ?? 'default'
}

/**
 * The value stored for a Packer variable: nested under its template key in
 * the multi-image layout (see below), flat under its name otherwise — and as
 * a fallback when the nested slot is missing. ``undefined`` when unset.
 */
export function storedPackerValue(
  variables: Record<string, any> | null | undefined,
  variable: AppVariable,
  multiImage: boolean,
): unknown {
  if (multiImage) {
    const nested = variables?.packer?.[templateKeyOf(variable)]?.[variable.name]
    if (nested !== undefined) return nested
  }
  return variables?.[variable.name]
}

/**
 * Multi-image Packer layout: such apps store Packer values nested under
 * ``variables.packer[<template_key>][<name>]`` instead of flat under
 * ``variables[<name>]``. Detected by ``packer`` being a non-empty object whose
 * every entry is itself a (non-array) object. Used by the summary view and by
 * ``submitDraft`` so both read the values the same way.
 */
export function isMultiImagePackerLayout(variables: unknown): boolean {
  const packer = (variables as Record<string, any> | null | undefined)?.packer
  if (!packer || typeof packer !== 'object' || Array.isArray(packer)) return false
  const keys = Object.keys(packer)
  if (keys.length === 0) return false
  return keys.every((k) => {
    const slot = packer[k]
    return !!slot && typeof slot === 'object' && !Array.isArray(slot)
  })
}
