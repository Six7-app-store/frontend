import { describe, it, expect } from 'vitest'
import { buildDeploymentPayload, distributeEvenly, fallbackTeamName, releaseVersion, withRelease } from '@/services/deployment-draft.service'
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
    groupCount: 1, assignments: [], version: 'latest', variables: {}, userInputVar: {}, groupNames: [],
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
