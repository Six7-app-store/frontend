import { describe, it, expect } from 'vitest'

import {
  extractErrorMessage,
  getErrorDetail,
  getErrorReason,
  getErrorStatus,
  getErrorStatusText,
  hasErrorResponse,
} from '@/utils/http-error'

describe('extractErrorMessage', () => {
  it('returns a string detail verbatim', () => {
    const err = { response: { data: { detail: 'Boom' } } }
    expect(extractErrorMessage(err)).toBe('Boom')
  })

  it('drills into detail.reason for structured detail', () => {
    const err = { response: { data: { detail: { reason: 'openstack_credentials_missing' } } } }
    expect(extractErrorMessage(err)).toBe('openstack_credentials_missing')
  })

  it('falls back to detail.message when reason is absent', () => {
    const err = { response: { data: { detail: { message: 'Something broke' } } } }
    expect(extractErrorMessage(err)).toBe('Something broke')
  })

  it('prefers reason over message when both present', () => {
    const err = { response: { data: { detail: { reason: 'r', message: 'm' } } } }
    expect(extractErrorMessage(err)).toBe('r')
  })

  it('falls back to err.message when there is no response detail', () => {
    expect(extractErrorMessage({ message: 'Network Error' })).toBe('Network Error')
  })

  it('returns a generic string when nothing is available', () => {
    expect(extractErrorMessage({})).toBe('Unknown error')
    expect(extractErrorMessage(null)).toBe('Unknown error')
  })
})

describe('error accessors', () => {
  const axiosLike = (status: number, detail: unknown) => ({ message: 'Request failed', response: { status, data: { detail } } })

  it('reads the HTTP status', () => {
    expect(getErrorStatus(axiosLike(409, 'busy'))).toBe(409)
    expect(getErrorStatus({ message: 'Network Error' })).toBeUndefined()
  })

  it('returns the raw detail (string, object or undefined)', () => {
    expect(getErrorDetail(axiosLike(400, 'Boom'))).toBe('Boom')
    const detail = { reason: 'r', active_deployments: 2 }
    expect(getErrorDetail(axiosLike(409, detail))).toBe(detail)
    expect(getErrorDetail({ response: { status: 500 } })).toBeUndefined()
  })

  it('reads detail.reason only from structured detail', () => {
    expect(getErrorReason(axiosLike(503, { reason: 'smtp_disabled' }))).toBe('smtp_disabled')
    expect(getErrorReason(axiosLike(400, 'plain string'))).toBeUndefined()
    expect(getErrorReason(axiosLike(400, { message: 'm' }))).toBeUndefined()
  })

  it('tells server answers from network errors and reads the status text', () => {
    expect(hasErrorResponse({ response: { status: 500, statusText: 'Internal Server Error' } })).toBe(true)
    expect(getErrorStatusText({ response: { status: 500, statusText: 'Internal Server Error' } })).toBe('Internal Server Error')
    expect(hasErrorResponse({ message: 'Network Error' })).toBe(false)
    expect(getErrorStatusText({ message: 'Network Error' })).toBeUndefined()
  })

  it.each([null, undefined, 'boom', 42, new Error('x')])('tolerates non-axios values (%s)', (value) => {
    expect(hasErrorResponse(value)).toBe(false)
    expect(getErrorStatusText(value)).toBeUndefined()
    expect(getErrorStatus(value)).toBeUndefined()
    expect(getErrorDetail(value)).toBeUndefined()
    expect(getErrorReason(value)).toBeUndefined()
  })
})
