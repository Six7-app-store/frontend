import { describe, it, expect } from 'vitest'
import type { AppVariable } from '@/types'
import {
  fileSummaries,
  formatSummaryValue,
  renderOsValue,
  toSummaryEntry,
  variableRows,
  type SummaryContext,
} from '@/services/deployment-summary.service'
import { formatSubmitError } from '@/services/deployment-submit-error.service'

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
const ctx: SummaryContext = { t, osName: (_type, _mode, value) => (value.startsWith('id-') ? `Name ${value}` : null) }
const v = (over: Partial<AppVariable>): AppVariable => ({ name: 'x', type: 'string', ...over }) as AppVariable

describe('formatSummaryValue', () => {
  it.each([
    [true, 'deployment.summary.yes'],
    [false, 'deployment.summary.no'],
    [['"a"', 'b'], 'a, b'],
    ['"quoted"', 'quoted'],
    ['[x]', 'x'],
    [null, '-'],
    ['', '-'],
    [3, '3'],
  ])('%j → %s', (val, expected) => expect(formatSummaryValue(val, t)).toBe(expected))
})

describe('renderOsValue', () => {
  it('shows names, keeps unknown values and splits multi values', () => {
    expect(renderOsValue('flavor', 'id', 'id-1', false, ctx.osName)).toBe('Name id-1')
    expect(renderOsValue('flavor', 'id', 'raw', false, ctx.osName)).toBe('raw')
    expect(renderOsValue('network', 'id', 'id-1, id-2', true, ctx.osName)).toBe('Name id-1, Name id-2')
    expect(renderOsValue('network', 'id', '', true, ctx.osName)).toBe('-')
  })
})

describe('toSummaryEntry', () => {
  it('lists scoped values per slot', () => {
    expect(toSummaryEntry(v({ name: 'q', varScope: 'team' }), { Rot: 1, Blau: 2 }, ctx))
      .toEqual({ label: 'q', value: 'Rot: 1 · Blau: 2' })
    expect(toSummaryEntry(v({ name: 'q', varScope: 'team' }), {}, ctx)).toEqual({ label: 'q', value: '-' })
  })

  it('keeps the submitted value next to an OpenStack name', () => {
    expect(toSummaryEntry(v({ name: 'f', osType: 'flavor', osMode: 'id' }), 'id-1', ctx))
      .toEqual({ label: 'f', value: 'Name id-1', raw: 'id-1' })
  })
})

describe('rows', () => {
  it('prefers the stored value over the default', () => {
    const defs = [v({ name: 'size', default: 'm' }), v({ name: 'zone', default: 'a' })]
    expect(variableRows(defs, { size: 's' }, ctx)).toEqual([
      { label: 'size', value: 's' },
      { label: 'zone', value: 'a' },
    ])
  })

  it('skips file variables in the variable rows and summarises their uploads', () => {
    const defs = [v({ name: 'host', default: 'h' }), v({ name: 'cert', osType: 'file', osScope: 'team' })]
    expect(variableRows(defs, {}, ctx)).toEqual([{ label: 'host', value: 'h' }])
    expect(fileSummaries(defs, { cert: { Rot: { name: 'a.pem', size: 2048 } as never, Blau: null } })).toEqual([
      { name: 'cert', scope: 'team', chips: [{ slot: 'Rot', filename: 'a.pem', size: '2 KB' }] },
    ])
  })
})

describe('formatSubmitError', () => {
  const err = (detail: unknown, message?: string) => ({ message, response: { data: { detail } } })

  it('fills in file name and sizes in MB', () => {
    expect(formatSubmitError(err({ reason: 'file_too_large', variable: 'cert', slot: 'Rot', actual_bytes: 3 * 1024 * 1024, limit_bytes: 2 * 1024 * 1024 }), t))
      .toBe('deployment.summary.errors.fileTooLarge {"filename":"cert/Rot","actualMb":"3.0","limitMb":"2.0"}')
  })

  it('falls back to the detail string, the message, then the generic text', () => {
    expect(formatSubmitError(err('Kontingent'), t)).toBe('Kontingent')
    expect(formatSubmitError(err({ reason: 'neu' }, 'Request failed'), t)).toBe('Request failed')
    expect(formatSubmitError(err(undefined), t)).toBe('deployment.summary.submitError')
  })
})
