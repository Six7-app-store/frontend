import { describe, it, expect } from 'vitest'
import {
  buildDeploymentPayload, distributeEvenly, fallbackTeamName, releaseVersion, suggestedName, teamLists, wizardTeams, withRelease,
} from '@/services/deployment-draft.service'
import type { DeploymentDraft } from '@/types'

describe('releaseVersion', () => {
  it('passes a tag string through', () => {
    expect(releaseVersion('v1.2.0')).toBe('v1.2.0')
  })

  it('guesses no version when nothing is set', () => {
    expect(releaseVersion('')).toBe('')
    expect(releaseVersion('  ')).toBe('')
    expect(releaseVersion(null)).toBe('')
    expect(releaseVersion(undefined)).toBe('')
  })

  it('reads version, then name, from a release object', () => {
    expect(releaseVersion({ version: 'v2', name: 'Second' })).toBe('v2')
    expect(releaseVersion({ name: 'v3' })).toBe('v3')
    expect(releaseVersion({})).toBe('')
  })
})

describe('withRelease', () => {
  const draft = {
    appId: 'app-1', appName: 'IDE', releaseTag: 'v1',
    variableDefinitions: [{ name: 'x', type: 'string' }], variables: { x: 'a' },
    userInputVar: '{"x":"a"}', fileUploads: { task: {} }, filesLost: true,
  } as unknown as DeploymentDraft

  it('keeps what was entered for the same release', () => {
    expect(withRelease(draft, { appId: 'app-1', appName: 'IDE', releaseTag: 'v1' }))
      .toEqual({ appId: 'app-1', appName: 'IDE', releaseTag: 'v1' })
  })

  it('drops variables and files of another app or version', () => {
    expect(withRelease(draft, { appId: 'app-1', appName: 'IDE', releaseTag: 'v2' })).toEqual({
      appId: 'app-1', appName: 'IDE', releaseTag: 'v2',
      variableDefinitions: [], variables: {}, userInputVar: {}, fileUploads: {}, filesLost: false,
    })
  })
})

describe('fallbackTeamName', () => {
  it('numbers teams from one', () => {
    expect(fallbackTeamName(0)).toBe('Team-1')
    expect(fallbackTeamName(4)).toBe('Team-5')
  })
})

describe('distributeEvenly', () => {
  it('gives the first groups the extra members', () => {
    expect(distributeEvenly(['a', 'b', 'c', 'd', 'e'], 3)).toEqual([['a', 'b'], ['c', 'd'], ['e']])
  })

  it('keeps the order and loses nobody', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `u${i}`)
    const groups = distributeEvenly(ids, 4)
    expect(groups.map((g) => g.length)).toEqual([3, 3, 2, 2])
    expect(groups.flat()).toEqual(ids)
  })

  it('leaves groups empty when there are more groups than ids', () => {
    expect(distributeEvenly(['a'], 3)).toEqual([['a'], [], []])
  })
})

describe('buildDeploymentPayload', () => {
  const draft = (over: Partial<DeploymentDraft>): DeploymentDraft => ({
    appId: 'app-1', name: 'Lab', releaseTag: 'v1', courseIds: [], studentIds: [], groupMode: 'one',
    groupCount: 1, assignments: [], variables: {}, userInputVar: {}, groupNames: [],
    variableDefinitions: [], fileUploads: {}, ...over,
  }) as DeploymentDraft

  it('sends all values as tofu when the definitions are missing', () => {
    const payload = buildDeploymentPayload(draft({ variableDefinitions: undefined as never, variables: { a: 1 } }))
    expect(payload.userInputVar).toEqual({ tofu: { a: 1 } })
  })

  it('leaves out a scoped variable without a filled slot', () => {
    const payload = buildDeploymentPayload(draft({
      variableDefinitions: [{ name: 'login', type: 'string', varScope: 'user' } as never],
      variables: { login: {} },
    }))
    expect(payload.userInputVar).toEqual({ tofu: {} })
  })

  it('omits files when no slot holds content', () => {
    const payload = buildDeploymentPayload(draft({ fileUploads: { cert: { all: { name: 'a', size: 1 } as never } } }))
    expect(payload).not.toHaveProperty('files')
  })
})

describe('suggestedName', () => {
  it('verbindet App, Ziel und Datum und lässt Unbekanntes weg', () => {
    expect(suggestedName('Online-IDE', 'WI SE B 23', '20.10.2026')).toBe('Online-IDE – WI SE B 23 – 20.10.2026')
    expect(suggestedName('Online-IDE', '', '20.10.2026')).toBe('Online-IDE – 20.10.2026')
  })
})

describe('teamLists', () => {
  it('liest Arrays und index-geschlüsselte Objekte und füllt fehlende Teams auf', () => {
    expect(teamLists([['a'], ['b']], 3)).toEqual([['a'], ['b'], []])
    expect(teamLists({ 0: ['a'], 2: ['c'] }, 3)).toEqual([['a'], [], ['c']])
    expect(teamLists(null, 1)).toEqual([[]])
  })
})

describe('wizardTeams', () => {
  const base = {
    studentIds: ['u1', 'u2', 'u3'], groupNames: [], assignments: [], groupCount: 1,
  } as unknown as DeploymentDraft
  const teams = (over: Partial<DeploymentDraft>) => wizardTeams({ ...base, ...over })

  it('setzt bei „Alle zusammen“ alle in ein Team, auch ohne Zuordnung', () => {
    expect(teams({ groupMode: 'one' })).toEqual([{ name: 'Team-1', userIds: ['u1', 'u2', 'u3'] }])
    expect(teams({ groupMode: 'one', groupNames: ['Kurs'] })[0]!.name).toBe('Kurs')
  })

  it('gibt bei „Jeder einzeln“ jeder Person ein Team', () => {
    expect(teams({ groupMode: 'eachUser' }).map((t) => t.userIds)).toEqual([['u1'], ['u2'], ['u3']])
  })

  it('nimmt bei „Gruppen selbst bilden“ die gebildeten Teams ohne Abgewählte', () => {
    expect(teams({
      groupMode: 'custom', groupCount: 2, groupNames: ['Rot', ' '],
      assignments: [['u1', 'weg'], ['u2', 'u3']] as never,
    })).toEqual([
      { name: 'Rot', userIds: ['u1'] },
      { name: 'Team-2', userIds: ['u2', 'u3'] },
    ])
  })

  it('teilt bei „Gruppen selbst bilden“ ohne gebildete Teams gleichmäßig auf', () => {
    expect(teams({ groupMode: 'custom', groupCount: 2 }).map((t) => t.userIds)).toEqual([['u1', 'u2'], ['u3']])
  })

  it('hat ohne Studierende keine Teams', () => {
    expect(teams({ groupMode: 'one', studentIds: [] })).toEqual([])
  })
})
