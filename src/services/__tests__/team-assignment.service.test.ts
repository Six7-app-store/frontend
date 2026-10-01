import { describe, it, expect } from 'vitest'
import {
  canProceed,
  moveStudent,
  shuffled,
  unassignedIds,
  withoutStudent,
} from '@/services/team-assignment.service'

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

describe('canProceed', () => {
  it('needs an empty pool', () => {
    expect(canProceed([['a']], ['T'], 1, 1)).toBe(false)
  })

  it('needs every counted team filled and named', () => {
    expect(canProceed([['a'], []], ['T1', 'T2'], 2, 0)).toBe(false)
    expect(canProceed([['a'], ['b']], ['T1', ' '], 2, 0)).toBe(false)
    expect(canProceed([['a'], ['b']], ['T1', 'T2'], 2, 0)).toBe(true)
  })

  it('ignores teams beyond the count', () => {
    expect(canProceed([['a'], []], ['T1'], 1, 0)).toBe(true)
  })
})
