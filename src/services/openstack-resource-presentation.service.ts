/**
 * How the OpenStack resource picker shows a resource and what it stores
 * for a selection. Pure functions — no Vue, no I/O; texts come in through
 * ``t``.
 */
import type { OsResourceType } from '@/api/openstack-resources.api'
import { splitCsv } from '@/services/variable-types'
import { formatBytes } from '@/utils/format'

export type Translate = (key: string, params?: Record<string, unknown>) => string

/** A resource as one row of the picker. */
export interface ResourceItem {
  /** UUID, or the name for types that have none (keypairs, availability zones). */
  id: string
  name: string
  /** Rough specs under the name. */
  secondary?: string
  /** Small badge next to the name. */
  tertiary?: string
  raw: any
}

/** A flavor's RAM: MB below 1 GB, else GB with at most one decimal. */
export function formatRam(mb: number | undefined | null): string {
  if (!mb) return '0 MB'
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
}

/** The picker row for a raw resource of ``type`` as the backend sends it. */
export function adaptResource(type: OsResourceType, raw: any, t: Translate): ResourceItem {
  switch (type) {
    case 'flavor':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: `${raw.vcpus ?? 0} vCPU · ${formatRam(raw.ram)} RAM · ${raw.disk ?? 0} GB Disk`,
        tertiary: raw.is_public ? '' : t('openstackPicker.network.private'),
        raw,
      }
    case 'image': {
      const size = raw.size ? formatBytes(raw.size) : ''
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.disk_format ? `${raw.disk_format} · ${size}` : size,
        tertiary: raw.status === 'active' ? '' : raw.status,
        raw,
      }
    }
    case 'network':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.description || '',
        tertiary: [
          raw.shared ? t('openstackPicker.network.shared') : '',
          raw.external ? t('openstackPicker.network.external') : '',
        ].filter(Boolean).join(' · '),
        raw,
      }
    case 'subnet':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: `${raw.cidr || '?'}  IPv${raw.ip_version ?? 4}`,
        tertiary: raw.gateway_ip ? `${t('openstackPicker.network.gatewayPrefix')} ${raw.gateway_ip}` : '',
        raw,
      }
    case 'keypair':
      return {
        id: raw.name ?? '',
        name: raw.name ?? '',
        secondary: raw.fingerprint ? raw.fingerprint.slice(0, 16) + '…' : '',
        tertiary: raw.type || 'ssh',
        raw,
      }
    case 'security_group':
    case 'floating_ip_pool':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.description || '',
        raw,
      }
    case 'volume':
      return {
        id: raw.id ?? '',
        name: raw.name || t('openstackPicker.unnamed'),
        secondary: `${raw.size ?? 0} GB · ${raw.volume_type || ''}`,
        tertiary: [raw.bootable ? 'bootable' : '', raw.status].filter(Boolean).join(' · '),
        raw,
      }
    case 'router':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.status || '',
        tertiary: raw.external_gateway_info ? t('openstackPicker.network.externalGateway') : '',
        raw,
      }
    case 'availability_zone':
      return {
        id: raw.name ?? '',
        name: raw.name ?? '',
        secondary: raw.state || '',
        raw,
      }
  }
}

/**
 * The selected keys in a ``v-model`` value. HCL defaults can arrive as a
 * number or boolean (``default = 2``) and are string-coerced; ``null``,
 * ``undefined`` and their string forms count as empty. In multi mode an
 * array or a comma-separated string is accepted.
 */
export function selectedKeysOf(value: unknown, multi: boolean): Set<string> {
  const toKey = (x: unknown): string => {
    if (x === null || x === undefined) return ''
    const s = String(x)
    return s === 'null' || s === 'undefined' ? '' : s
  }
  if (multi) {
    if (Array.isArray(value)) return new Set(value.map(toKey).filter(Boolean))
    if (typeof value === 'string' && value.trim()) return new Set(splitCsv(value))
    return new Set()
  }
  const key = toKey(value)
  return new Set(key ? [key] : [])
}

/** ``items`` matching ``query`` in name, id or spec line, the selected ones first (stable). */
export function filterResources(
  items: readonly ResourceItem[],
  query: string,
  isSelected: (item: ResourceItem) => boolean,
): ResourceItem[] {
  const q = query.trim().toLowerCase()
  const base = q
    ? items.filter((it) =>
        it.name.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q) ||
        (it.secondary || '').toLowerCase().includes(q))
    : items
  return [...base].sort((a, b) => (isSelected(a) ? 0 : 1) - (isSelected(b) ? 0 : 1))
}
