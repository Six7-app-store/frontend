import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  parseDeploymentGroups,
  parseDeploymentVariables,
  cleanVariableValue,
} from '@/services/deployment-input.service'

describe('parseDeploymentGroups', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns no groups without input', () => {
    expect(parseDeploymentGroups(null)).toEqual([])
    expect(parseDeploymentGroups('')).toEqual([])
  })

  it('builds groups from assignments and names (JSON string or object)', () => {
    const input = { groupNames: ['Alpha'], assignments: { 0: ['s1', 's2'], 1: ['s3'] } }
    const expected = [
      { index: 0, name: 'Alpha', students: ['s1', 's2'] },
      { index: 1, name: 'Gruppe 2', students: ['s3'] },
    ]
    expect(parseDeploymentGroups(JSON.stringify(input))).toEqual(expected)
    expect(parseDeploymentGroups(input)).toEqual(expected)
  })

  it('names groups by position, not by assignment key', () => {
    expect(parseDeploymentGroups({ groupNames: ['First'], assignments: { 3: [] } })).toEqual([
      { index: 3, name: 'First', students: [] },
    ])
  })

  it('logs and returns no groups for broken JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(parseDeploymentGroups('{broken')).toEqual([])
    expect(spy).toHaveBeenCalledWith('Error parsing userInputVar:', expect.any(SyntaxError))
  })
})

describe('parseDeploymentVariables', () => {
  it('returns the variables map or an empty object', () => {
    expect(parseDeploymentVariables('{"variables": {"a": "1"}}')).toEqual({ a: '1' })
    expect(parseDeploymentVariables({ groupNames: [] })).toEqual({})
    expect(parseDeploymentVariables(undefined)).toEqual({})
  })

  it('logs and returns an empty object for broken JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(parseDeploymentVariables('nope')).toEqual({})
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('cleanVariableValue', () => {
  it('strips trailing comments and quotes', () => {
    expect(cleanVariableValue('ubuntu:22.04 # default image')).toBe('ubuntu:22.04')
    expect(cleanVariableValue('"m1.small"')).toBe('m1.small')
    expect(cleanVariableValue("it's")).toBe('its')
  })

  it('renders empty values as a dash', () => {
    expect(cleanVariableValue('')).toBe('-')
    expect(cleanVariableValue(undefined)).toBe('-')
    expect(cleanVariableValue('# only comment')).toBe('-')
  })
})
