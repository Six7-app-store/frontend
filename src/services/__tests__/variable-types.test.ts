import { describe, it, expect } from 'vitest'
import { isBool, isNumber, isList, splitCsv } from '@/services/variable-types'

describe('variable types', () => {
  it.each(['bool', 'boolean', 'BOOL'])('%s is a bool', (t) => expect(isBool(t)).toBe(true))
  it.each(['string', 'number', 'booleans'])('%s is not a bool', (t) => expect(isBool(t)).toBe(false))

  it.each(['number', 'int', 'integer', 'Number'])('%s is a number', (t) => expect(isNumber(t)).toBe(true))
  it.each(['string', 'list(number)'])('%s is not a number', (t) => expect(isNumber(t)).toBe(false))

  it.each(['list(string)', 'set(number)', 'array', 'LIST(string)'])('%s is a list', (t) =>
    expect(isList(t)).toBe(true))
  it.each(['string', 'map(string)', 'number'])('%s is not a list', (t) => expect(isList(t)).toBe(false))
})

describe('splitCsv', () => {
  it('trims entries and drops empty ones', () => {
    expect(splitCsv(' a, b,,c ,')).toEqual(['a', 'b', 'c'])
  })

  it('yields an empty list for blank input', () => {
    expect(splitCsv('')).toEqual([])
    expect(splitCsv(' , ')).toEqual([])
  })
})
