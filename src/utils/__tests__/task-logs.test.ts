import { describe, it, expect } from 'vitest'

import { countLogEntries, splitTaskLogs, countTfResources, FAILURE_DETAIL_DIVIDER } from '@/utils/task-logs'

describe('countLogEntries', () => {
  it('returns null when there are no logs', () => {
    expect(countLogEntries(null)).toBeNull()
    expect(countLogEntries(undefined)).toBeNull()
  })

  it('counts the inner logs array of a failure payload object', () => {
    expect(countLogEntries({ logs: [{ timestamp: 't', level: 'INFO', message: 'm' }], error: 'x' })).toBe(1)
  })

  it('counts a JSON string holding an array or an object', () => {
    expect(countLogEntries('[1, 2, 3]')).toBe(3)
    expect(countLogEntries(' {"logs": [1, 2]} ')).toBe(2)
  })

  it('returns null for plain text, broken JSON and objects without logs', () => {
    expect(countLogEntries('just text')).toBeNull()
    expect(countLogEntries('{broken')).toBeNull()
    expect(countLogEntries('{broken}')).toBeNull()
    expect(countLogEntries({ error: 'x' })).toBeNull()
  })
})

describe('splitTaskLogs', () => {
  it('returns an empty non-failure result for empty input', () => {
    expect(splitTaskLogs(null)).toEqual({ headline: '', details: '', isFailure: false })
    expect(splitTaskLogs('')).toEqual({ headline: '', details: '', isFailure: false })
  })

  it('splits at the technical-details divider', () => {
    expect(splitTaskLogs(`Worker weg.\n${FAILURE_DETAIL_DIVIDER}\nWorkerLostError`)).toEqual({
      headline: 'Worker weg.',
      details: 'WorkerLostError',
      isFailure: true,
    })
  })

  it('splits the legacy "Task failed:" shape at the first newline', () => {
    expect(splitTaskLogs('Task failed: boom\nTraceback\n  line')).toEqual({
      headline: 'Task failed: boom',
      details: 'Traceback\n  line',
      isFailure: true,
    })
    expect(splitTaskLogs('Task failed: boom ')).toEqual({ headline: 'Task failed: boom', details: '', isFailure: true })
  })

  it('treats other text as non-failure', () => {
    expect(splitTaskLogs('all good')).toEqual({ headline: '', details: '', isFailure: false })
  })
})

describe('countTfResources', () => {
  it('returns 0 without state', () => {
    expect(countTfResources(null)).toBe(0)
    expect(countTfResources(undefined)).toBe(0)
  })

  it('counts resources of an object or a JSON string', () => {
    expect(countTfResources({ resources: [1, 2] })).toBe(2)
    expect(countTfResources('{"resources": [1]}')).toBe(1)
  })

  it('returns 0 for states without resources or unparsable strings', () => {
    expect(countTfResources({ version: 4 })).toBe(0)
    expect(countTfResources('not json')).toBe(0)
  })
})
