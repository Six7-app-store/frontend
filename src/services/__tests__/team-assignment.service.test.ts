import { describe, it, expect } from 'vitest'
import {
  RECOMMENDED_MODE,
  moveStudent,
  splitProblem,
  shuffled,
  unassignedIds,
  withoutStudent,
} from '@/services/team-assignment.service'
import type { DeploymentDraft } from '@/types'

describe('withoutStudent', () => {
  it('removes the student from every team and leaves the input alone', () => {
    const before = [['a', 'b'], ['b'], []]
    expect(withoutStudent(before, 'b')).toEqual([['a'], [], []])
    expect(before).toEqual([['a', 'b'], ['b'], []])
  })
})

describe('moveStudent', () => {
  it('moves a student from one team into another', () => {
    expect(moveStudent([['a', 'b'], []], 'a', 1)).toEqual([['b'], ['a']])
  })

  it('puts a student back into the pool for null', () => {
    expect(moveStudent([['a'], ['b']], 'b', null)).toEqual([['a'], []])
  })

  it('creates the target team when it does not exist yet', () => {
    expect(moveStudent([], 'a', 1)).toEqual([[], ['a']])
  })

  it('does not duplicate a student dropped onto its own team', () => {
    expect(moveStudent([['a']], 'a', 0)).toEqual([['a']])
  })
})

describe('unassignedIds', () => {
  it('keeps the selection order', () => {
    expect(unassignedIds(['c', 'a', 'b'], [['a']])).toEqual(['c', 'b'])
  })

  it('tolerates holes in the assignment list', () => {
    expect(unassignedIds(['a'], [undefined as never])).toEqual(['a'])
  })
})

describe('shuffled', () => {
  it('is Fisher-Yates driven by random', () => {
    expect(shuffled(['u1', 'u2', 'u3'], () => 0)).toEqual(['u2', 'u3', 'u1'])
    expect(shuffled(['u1', 'u2', 'u3'], () => 0.99)).toEqual(['u1', 'u2', 'u3'])
  })

  it('returns a copy with every id', () => {
    const ids = ['a', 'b', 'c', 'd']
    expect([...shuffled(ids)].sort()).toEqual(ids)
  })
})


describe('RECOMMENDED_MODE', () => {
  it('empfiehlt „Alle zusammen“, solange keine App etwas anderes vorgibt', () => {
    expect(RECOMMENDED_MODE).toBe('one')
  })
})

describe('splitProblem', () => {
  const draft = (over: Partial<DeploymentDraft>) => ({
    studentIds: ['a', 'b'], groupMode: 'custom', groupCount: 2, groupNames: ['Rot', 'Blau'], assignments: [['a'], ['b']], ...over,
  }) as DeploymentDraft

  it('hat bei „Alle zusammen“ und „Jeder einzeln“ nie ein Problem — auch ohne Zuordnung', () => {
    expect(splitProblem(draft({ groupMode: 'one', assignments: [] }))).toBeNull()
    expect(splitProblem(draft({ groupMode: 'eachUser', assignments: [] }))).toBeNull()
  })

  it('verlangt bei selbst gebildeten Gruppen alle zugeordnet, keine leere und keine namenlose Gruppe', () => {
    expect(splitProblem(draft({}))).toBeNull()
    expect(splitProblem(draft({ assignments: [['a'], []] as never, studentIds: ['a'] }))).toBe('deployment.wizard.block.emptyTeam')
    expect(splitProblem(draft({ assignments: [['a']] as never }))).toBe('deployment.wizard.block.unassigned')
    expect(splitProblem(draft({ groupNames: ['Rot', ' '] }))).toBe('deployment.wizard.block.unnamedTeam')
  })
})
