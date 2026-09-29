/**
 * The rows of the deployment summary: one per variable with its label and
 * the value as the user should read it. Pure — the caller passes its
 * translate function and the lookup of OpenStack display names.
 */
import type { AppVariable, DeploymentFile } from '@/types'
import {
  effectiveVariableScope,
  isMultiImagePackerLayout,
  storedPackerValue,
  templateKeyOf,
} from '@/services/deployment-variables.service'
import { splitCsv } from '@/services/variable-types'
import { formatBytes } from '@/utils/format'
import type { Translate } from '@/services/deployment-submit-error.service'

export interface SummaryRow {
  label: string
  value: string
  /** The submitted value, when the display shows something else (an OpenStack name). */
  raw?: string
}

export interface SummaryContext {
  t: Translate
  /** Display name of an OpenStack resource, or null when unknown. */
  osName: (osType: string, mode: 'id' | 'name', value: string) => string | null
}

export interface FileSummary {
  name: string
  scope: 'all' | 'team' | 'user'
  chips: Array<{ slot: string; filename: string; size: string }>
}

/** A value as text: yes/no for booleans, lists comma-joined, wrapping quotes and brackets stripped, "-" when empty. */
export function formatSummaryValue(val: unknown, t: Translate): string {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'boolean') return val ? t('deployment.summary.yes') : t('deployment.summary.no')
  if (Array.isArray(val)) return val.map((item) => String(item).replace(/^"|"$/g, '')).join(', ')
  if (typeof val === 'string') return val.replace(/^["'[]+|["'\]]+$/g, '')
  return String(val)
}

/** An OpenStack value as display names (comma-separated for multi values); raw when unknown. */
export function renderOsValue(
  osType: string,
  mode: 'id' | 'name',
  val: unknown,
  isMulti: boolean,
  osName: SummaryContext['osName'],
): string {
  if (val === null || val === undefined || val === '') return '-'
  let parts: string[]
  if (Array.isArray(val)) parts = val.map((v) => String(v).trim()).filter(Boolean)
  else if (typeof val === 'string') parts = isMulti ? splitCsv(val) : [val.trim()].filter(Boolean)
  else parts = [String(val)]
  if (parts.length === 0) return '-'
  return parts.map((p) => osName(osType, mode, p) ?? p).join(', ')
}

/**
 * The row of one variable. Scoped variables list ``slot: value`` per team
 * or person; OpenStack variables show names, with the submitted value as
 * ``raw`` when it differs.
 */
export function toSummaryEntry(def: AppVariable, val: any, ctx: SummaryContext): SummaryRow {
  const osValue = (v: unknown) => renderOsValue(def.osType!, def.osMode || 'name', v, !!def.osMulti, ctx.osName)

  if (effectiveVariableScope(def) !== 'all' && def.osType !== 'file') {
    if (!val || typeof val !== 'object' || Array.isArray(val)) return { label: def.name, value: '-' }
    const entries = Object.entries(val)
    if (entries.length === 0) return { label: def.name, value: '-' }
    const lines = entries.map(([slot, raw]) =>
      `${slot}: ${def.osType ? osValue(raw) : formatSummaryValue(raw, ctx.t)}`)
    return { label: def.name, value: lines.join(' · ') }
  }

  if (def.osType) {
    const display = osValue(val)
    const rawString = formatSummaryValue(val, ctx.t)
    return { label: def.name, value: display, raw: display !== rawString ? rawString : undefined }
  }
  return { label: def.name, value: formatSummaryValue(val, ctx.t) }
}

/**
 * Rows of the Packer variables. In the multi-image layout the value is
 * read per template and the label carries the template, so three
 * "region" rows can be told apart.
 */
export function packerRows(
  definitions: AppVariable[],
  variables: Record<string, any> | null | undefined,
  ctx: SummaryContext,
): SummaryRow[] {
  const multiImage = isMultiImagePackerLayout(variables)
  return definitions.filter((def) => def.source === 'packer').map((def) => {
    const stored = storedPackerValue(variables, def, multiImage)
    const entry = toSummaryEntry(def, stored !== undefined ? stored : def.default, ctx)
    return multiImage ? { ...entry, label: `[${templateKeyOf(def)}] ${entry.label}` } : entry
  })
}

/** Rows of the Terraform variables; file variables have their own card. */
export function terraformRows(
  definitions: AppVariable[],
  variables: Record<string, any> | null | undefined,
  ctx: SummaryContext,
): SummaryRow[] {
  const current = variables || {}
  return definitions
    .filter((def) => def.source === 'terraform' && def.osType !== 'file')
    .map((def) => toSummaryEntry(def, current[def.name] !== undefined ? current[def.name] : def.default, ctx))
}

/** One entry per file variable with its uploaded slots (name and size, never the content). */
export function fileSummaries(
  definitions: AppVariable[],
  uploads: Record<string, Record<string, DeploymentFile | null>> | null | undefined,
): FileSummary[] {
  return definitions.filter((def) => def.osType === 'file').map((def) => ({
    name: def.name,
    scope: (def.osScope || 'all') as FileSummary['scope'],
    chips: Object.entries(uploads?.[def.name] || {})
      .filter((entry): entry is [string, DeploymentFile] => !!entry[1])
      .map(([slot, file]) => ({ slot, filename: file.name, size: formatBytes(file.size || 0) })),
  }))
}
