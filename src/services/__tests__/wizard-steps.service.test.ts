import { describe, it, expect } from 'vitest'
import {
  canShowStep,
  draftBlockReason,
  furthestReachableStep,
  isWizardStep,
  stepsFor,
} from '@/services/wizard-steps.service'
import type { DeploymentDraft } from '@/types'

const draft = (over: Partial<DeploymentDraft> = {}): DeploymentDraft => ({
  entry: 'catalog',
  appId: 'app-1',
  appName: 'Online-IDE',
  releaseTag: 'v1.0.0',
  name: 'Online-IDE – WI 23 – 20.10.2026',
  courseIds: [],
  studentIds: ['u1'],
  groupMode: 'one',
  groupCount: 1,
  assignments: [],
  userInputVar: {},
  variables: {},
  version: '',
  groupNames: [],
  ...over,
})

describe('stepsFor', () => {
  it('hat vom Katalog drei Schritte und von der App-Seite zwei', () => {
    expect(stepsFor('catalog')).toEqual(['app', 'target', 'start'])
    expect(stepsFor('app')).toEqual(['target', 'start'])
  })
})

describe('isWizardStep', () => {
  it('kennt nur die drei Schritte', () => {
    expect(['app', 'target', 'start'].every(isWizardStep)).toBe(true)
    expect(isWizardStep('config')).toBe(false)
    expect(isWizardStep(undefined)).toBe(false)
  })
})

describe('draftBlockReason', () => {
  it('sperrt den App-Schritt ohne App oder ohne Version', () => {
    expect(draftBlockReason('app', draft({ appId: null }))).toBe('deployment.wizard.block.noApp')
    expect(draftBlockReason('app', draft({ releaseTag: '' }))).toBe('deployment.wizard.block.noVersion')
    expect(draftBlockReason('app', draft())).toBeNull()
  })

  it('sperrt das Ziel ohne Studierende oder ohne Namen', () => {
    expect(draftBlockReason('target', draft({ studentIds: [] }))).toBe('deployment.wizard.block.noStudents')
    expect(draftBlockReason('target', draft({ name: '  ' }))).toBe('deployment.wizard.block.noName')
    expect(draftBlockReason('target', draft())).toBeNull()
  })

  it('verlangt in späteren Schritten auch alles Frühere', () => {
    expect(draftBlockReason('start', draft({ appId: null }))).toBe('deployment.wizard.block.noApp')
    expect(draftBlockReason('start', draft({ studentIds: [] }))).toBe('deployment.wizard.block.noStudents')
  })
})

describe('furthestReachableStep / canShowStep', () => {
  it('führt auf den ersten unvollständigen Schritt', () => {
    expect(furthestReachableStep(stepsFor('catalog'), draft({ appId: null }))).toBe('app')
    expect(furthestReachableStep(stepsFor('catalog'), draft({ studentIds: [] }))).toBe('target')
    expect(furthestReachableStep(stepsFor('catalog'), draft())).toBe('start')
  })

  it('zeigt einen Schritt nur, wenn ihn der Draft erreicht und der Einstieg ihn hat', () => {
    expect(canShowStep('start', draft({ studentIds: [] }))).toBe(false)
    expect(canShowStep('target', draft({ studentIds: [] }))).toBe(true)
    expect(canShowStep('app', draft({ entry: 'app' }))).toBe(false)
    expect(canShowStep('start', draft({ entry: 'app' }))).toBe(true)
  })
})
