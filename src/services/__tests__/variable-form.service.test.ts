import { describe, it, expect } from 'vitest'
import type { AppVariable } from '@/types'
import {
  dedupeDefinitions,
  dropStaleSlots,
  hydrateFromDraft,
  hydrateFromInput,
  missingRequired,
  seedScopedDefault,
  serializeValues,
  slotKeysFor,
  type WizardTeam,
} from '@/services/variable-form.service'

const v = (over: Partial<AppVariable>): AppVariable =>
  ({ name: 'x', type: 'string', ...over }) as AppVariable

const teams: WizardTeam[] = [
  { name: 'Rot', members: [{ userId: 'u1', username: 'anna' }] },
  { name: 'Blau', members: [{ userId: 'u2', username: 'ben' }, { userId: 'u3', username: 'cem' }] },
]

describe('slots and keys', () => {
  it('has one slot per team or per person', () => {
    expect(slotKeysFor(v({ varScope: 'team' }), teams)).toEqual(['Rot', 'Blau'])
    expect(slotKeysFor(v({ varScope: 'user' }), teams)).toEqual(['Rot-anna', 'Blau-ben', 'Blau-cem'])
    expect(slotKeysFor(v({}), teams)).toEqual([])
  })

  it('keeps the first of repeated definitions', () => {
    const defs = dedupeDefinitions([
      v({ name: 'a', default: 1 }), v({ name: 'a', default: 2 }), v({ name: 'b', default: 3 }),
    ])
    expect(defs.map((d) => `${d.name}:${d.default}`)).toEqual(['a:1', 'b:3'])
  })
})

describe('seedScopedDefault', () => {
  it('fills empty slots with the default and keeps existing values', () => {
    const quota = v({ varScope: 'team', type: 'number', default: 5 })
    expect(seedScopedDefault(quota, teams, { Rot: 7, Blau: '' })).toEqual({ Rot: 7, Blau: 5 })
  })

  it('uses comma text for list defaults and leaves object defaults alone', () => {
    expect(seedScopedDefault(v({ varScope: 'team', type: 'list(string)', default: ['a', 'b'] }), teams))
      .toEqual({ Rot: 'a, b', Blau: 'a, b' })
    expect(seedScopedDefault(v({ varScope: 'team', type: 'map(string)', default: {} }), teams)).toEqual({})
  })
})

describe('hydrate', () => {
  it('restores from the draft, falling back to the default and skipping files', () => {
    const defs = [v({ name: 'a', default: 'd' }), v({ name: 'tags', type: 'list(string)' }), v({ name: 'f', osType: 'file' })]
    expect(hydrateFromDraft(defs, { tags: ['x', 'y'] }, teams)).toEqual({ a: 'd', tags: 'x, y' })
  })

  it('prefers saved input over defaults and turns an empty bool into false', () => {
    const defs = [v({ name: 'a', default: 'd' }), v({ name: 'on', type: 'bool' })]
    expect(hydrateFromInput(defs, { a: 'saved' }, teams)).toEqual({ a: 'saved', on: false })
  })
})

describe('serializeValues', () => {
  it('stores converted values and records only changes against the default', () => {
    const defs = [v({ name: 'port', type: 'number', default: 22 }), v({ name: 'host', default: 'h' })]
    expect(serializeValues(defs, { port: '8080', host: ' h ' })).toEqual({
      changed: { port: 8080 },
      all: { port: 8080, host: ' h ' },
    })
  })

  it('treats a list as unchanged regardless of order', () => {
    const defs = [v({ name: 'tags', type: 'list(string)', default: ['a', 'b'] })]
    expect(serializeValues(defs, { tags: 'b, a' }).changed).toEqual({})
  })

  it('keeps only filled slots of a scoped variable', () => {
    const defs = [v({ name: 'login', varScope: 'user' })]
    expect(serializeValues(defs, { login: { 'Rot-anna': 'a1', 'Blau-ben': '  ' } })).toEqual({
      changed: { login: { 'Rot-anna': 'a1' } },
      all: { login: { 'Rot-anna': 'a1' } },
    })
  })
})

describe('missingRequired and dropStaleSlots', () => {
  it('names missing required values per slot', () => {
    const defs = [v({ name: 'pw', required: true }), v({ name: 'login', varScope: 'team', required: true })]
    expect(missingRequired(defs, { pw: ' ', login: { Rot: 'x' } }, teams)).toEqual(['pw', 'login (Blau)'])
  })

  it('drops slots of teams that no longer exist', () => {
    const defs = [v({ name: 'login', varScope: 'team' })]
    const values = { login: { Rot: 'a', Alt: 'b' } }
    expect(dropStaleSlots(defs, values, teams)).toEqual(['login → Alt'])
    expect(values.login).toEqual({ Rot: 'a' })
  })
})
