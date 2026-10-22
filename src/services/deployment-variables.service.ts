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

/** OpenStack resource types with a plain name of their own (``deployment.wizard.labels.<type>``). */
const LABELLED_OS_TYPES = new Set(['flavor', 'image', 'network', 'subnet', 'keypair', 'security_group', 'floating_ip_pool', 'volume', 'router', 'availability_zone'])

/**
 * What a variable is called for people who do not know OpenTofu: the plain
 * name of its OpenStack resource ("Größe der VM" for a flavor), else the
 * first sentence of its description, else its name with spaces.
 *
 * Returns either an i18n key (``key``) or a ready text (``text``); the
 * caller translates.
 */
export function variableLabel(variable: AppVariable): { key: string } | { text: string } {
  if (variable.osType && LABELLED_OS_TYPES.has(variable.osType)) {
    return { key: `deployment.wizard.labels.${variable.osType}` }
  }
  const description = variableDisplayDescription(variable.description)
  const sentence = description.split(/(?<=[.!?])\s/)[0]?.replace(/[.!?]$/, '').trim()
  if (sentence && sentence.length <= 60) return { text: sentence }
  const spaced = variable.name.replace(/_+/g, ' ').trim()
  return { text: spaced.charAt(0).toUpperCase() + spaced.slice(1) }
}
