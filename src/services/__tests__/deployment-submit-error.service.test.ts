import { describe, it, expect } from 'vitest'
import { formatSubmitError } from '@/services/deployment-submit-error.service'

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
const err = (detail: unknown, message?: string) => ({ message, response: { data: { detail } } })

describe('formatSubmitError', () => {
  it('fills in file name and sizes in MB', () => {
    expect(formatSubmitError(err({ reason: 'file_too_large', variable: 'cert', slot: 'Rot', actual_bytes: 3 * 1024 * 1024, limit_bytes: 2 * 1024 * 1024 }), t))
      .toBe('deployment.summary.errors.fileTooLarge {"filename":"cert/Rot","actualMb":"3.0","limitMb":"2.0"}')
  })

  it('names every missing required input with its slot', () => {
    expect(formatSubmitError(err({ reason: 'required_missing', missing: [{ variable: 'task', slot: 'Team-1-mika' }, { variable: 'login' }] }), t))
      .toBe('deployment.summary.errors.requiredMissing {"items":"task (Team-1-mika), login"}')
    expect(formatSubmitError(err({ reason: 'required_slot_empty', variable: 'quota', missing_slots: ['Blau'] }), t))
      .toBe('deployment.summary.errors.requiredMissing {"items":"quota (Blau)"}')
  })

  it('explains a missing or unapproved version', () => {
    expect(formatSubmitError(err({ reason: 'version_required' }), t)).toBe('deployment.summary.errors.versionRequired')
    expect(formatSubmitError(err({ code: 'version_not_approved' }), t)).toBe('deployment.summary.errors.versionNotApproved')
  })

  it('falls back to the detail string, the message, then the generic text', () => {
    expect(formatSubmitError(err('Kontingent'), t)).toBe('Kontingent')
    expect(formatSubmitError(err({ reason: 'neu' }, 'Request failed'), t)).toBe('Request failed')
    expect(formatSubmitError(err(undefined), t)).toBe('deployment.summary.submitError')
  })
})
