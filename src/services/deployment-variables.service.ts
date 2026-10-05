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
 * A variable's description for people: without the ``@openstack:…``
 * markers the platform reads from it.
 */
export function variableDisplayDescription(description: string | null | undefined): string {
  return (description ?? '')
    .replace(/@openstack:\S*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
