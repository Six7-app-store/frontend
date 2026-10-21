import { describe, it, expect } from 'vitest'
import { fileKey, matchFiles, normalizeKey, personKeys, type FileTarget } from '@/services/file-matching.service'

describe('normalizeKey / fileKey', () => {
  it('macht Namen vergleichbar: klein, ohne Akzente, Trenner als Punkt', () => {
    expect(normalizeKey('Luca Bäck')).toBe('luca.back')
    expect(normalizeKey('__Team #1__')).toBe('team.1')
    expect(fileKey('Luca_Baeck.JAVA')).toBe('luca.baeck')
    expect(fileKey('archiv.tar.gz')).toBe('archiv.tar')
    expect(fileKey('.hidden')).toBe('hidden')
  })
})

describe('personKeys', () => {
  it('nimmt Username, E-Mail-Teil und „vorname.nachname“, ohne Doppelte', () => {
    expect(personKeys({ username: 'luca.baeck', email: 'luca.baeck@dhbw.de', firstName: 'Luca', lastName: 'Bäck' }))
      .toEqual(['luca.baeck', 'luca.back'])
    expect(personKeys({ username: 'mjun' })).toEqual(['mjun'])
  })
})

describe('matchFiles', () => {
  const targets: FileTarget[] = [
    { slot: 'T-luca', label: 'Luca', keys: ['luca.baeck', 'luca.back'] },
    { slot: 'T-mika', label: 'Mika', keys: ['mika.jun'] },
    { slot: 'T-mika2', label: 'Mika 2', keys: ['mika.jun2', 'mika'] },
    { slot: 'T-x', label: 'X', keys: ['mika'] },
  ]

  it('ordnet eindeutige Namen ihrem Slot zu', () => {
    expect(matchFiles(['luca.baeck.java', 'Mika Jun.java'], targets))
      .toEqual({ bySlot: { 'T-luca': 0, 'T-mika': 1 }, unmatched: [] })
  })

  it('lässt unbekannte, mehrdeutige und doppelte Dateien unzugeordnet', () => {
    const result = matchFiles(['fremd.java', 'mika.java', 'luca.baeck.java', 'Luca Bäck.java'], targets)
    expect(result.bySlot).toEqual({ 'T-luca': 2 })
    expect(result.unmatched).toEqual([0, 1, 3])
  })
})
