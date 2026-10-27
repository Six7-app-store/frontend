import { describe, it, expect } from 'vitest'
import type { AppVariable } from '@/types'
import {
  dedupeDefinitions,
  dropStaleSlots,
  fileSlotsFor,
  missingFiles,
  startSections,
  withoutStaleFileSlots,
  hydrateFromDraft,
  hydrateFromInput,
  missingRequired,
  outOfRange,
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

describe('outOfRange', () => {
  const disk = v({ name: 'disk_gb', type: 'number', minValue: 0, maxValue: 200 })

  it('names a number outside the bounds together with the range', () => {
    expect(outOfRange([disk], { disk_gb: 500 }, teams)).toEqual(['disk_gb: 0–200'])
    expect(outOfRange([disk], { disk_gb: -1 }, teams)).toEqual(['disk_gb: 0–200'])
  })

  it('accepts the bounds themselves', () => {
    expect(outOfRange([disk], { disk_gb: 0 }, teams)).toEqual([])
    expect(outOfRange([disk], { disk_gb: 200 }, teams)).toEqual([])
  })

  it('reads a one-sided bound', () => {
    expect(outOfRange([v({ name: 'n', type: 'number', minValue: 10 })], { n: 5 }, teams)).toEqual(['n: ≥ 10'])
    expect(outOfRange([v({ name: 'n', type: 'number', maxValue: 3 })], { n: 5 }, teams)).toEqual(['n: ≤ 3'])
  })

  it('leaves empty values to missingRequired', () => {
    expect(outOfRange([disk], {}, teams)).toEqual([])
    expect(outOfRange([disk], { disk_gb: Number.NaN }, teams)).toEqual([])
  })

  it('checks every slot of a scoped variable', () => {
    const perTeam = { ...disk, varScope: 'team' as const }
    expect(outOfRange([perTeam], { disk_gb: { Rot: 10, Blau: 999 } }, teams)).toEqual(['disk_gb (Blau): 0–200'])
  })

  it('ignores variables without bounds', () => {
    expect(outOfRange([v({ name: 'n', type: 'number' })], { n: 1e9 }, teams)).toEqual([])
  })
})

describe('file slots', () => {
  const file = (osScope?: 'all' | 'team' | 'user', required = true) =>
    v({ name: 'task', osType: 'file', osScope, required })
  const doc = { name: 'a.txt', content_b64: 'YQ==', size: 1, content_type: 'text/plain' }

  it('hat einen Slot für alle, je Team oder je Person', () => {
    expect(fileSlotsFor(file(), teams)).toEqual(['all'])
    expect(fileSlotsFor(file('team'), teams)).toEqual(['Rot', 'Blau'])
    expect(fileSlotsFor(file('user'), teams)).toEqual(['Rot-anna', 'Blau-ben', 'Blau-cem'])
  })

  it('nennt fehlende Pflichtdateien je Slot und übergeht optionale', () => {
    const uploads = { task: { 'Rot-anna': doc } }
    expect(missingFiles([file('user')], uploads, teams)).toEqual([
      { variable: 'task', slot: 'Blau-ben' }, { variable: 'task', slot: 'Blau-cem' },
    ])
    expect(missingFiles([file('user', false)], {}, teams)).toEqual([])
    expect(missingFiles([v({ name: 'plain', required: true })], {}, teams)).toEqual([])
  })

  it('verwirft Dateien von Teams und Personen, die es nicht mehr gibt', () => {
    const uploads = { task: { 'Rot-anna': doc, 'Gelb-dora': doc }, gone: { all: doc } }
    expect(withoutStaleFileSlots([file('user')], uploads, teams)).toEqual({ task: { 'Rot-anna': doc } })
    expect(withoutStaleFileSlots([file('team')], { task: { Lila: doc } }, teams)).toEqual({})
    expect(withoutStaleFileSlots([file()], undefined, teams)).toEqual({})
  })
})

describe('startSections', () => {
  it('trennt Pflichtangaben, Dateien und alles mit Default', () => {
    const defs = [
      v({ name: 'login', required: true }),
      v({ name: 'task', osType: 'file', required: true }),
      v({ name: 'flavor', default: 'm1.small' }),
    ]
    const { required, files, advanced } = startSections(defs)
    expect([required, files, advanced].map((list) => list.map((d) => d.name))).toEqual([['login'], ['task'], ['flavor']])
  })

  it('stellt die Größe der VM in „Erweiterte Einstellungen“ an den Anfang', () => {
    const defs = [
      v({ name: 'net', osType: 'network', default: 'n1' }),
      v({ name: 'size', osType: 'flavor', default: 'm1.small' }),
      v({ name: 'size_required', osType: 'flavor', required: true }),
    ]
    const { required, advanced } = startSections(defs)
    expect(advanced.map((d) => d.name)).toEqual(['size', 'net'])
    expect(required.map((d) => d.name)).toEqual(['size_required'])
  })
})
