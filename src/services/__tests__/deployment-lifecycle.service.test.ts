import { describe, it, expect } from 'vitest'

import {
  DELETE_DISABLED_REASON,
  canDeleteDeployment,
  canPauseDeployment,
  canResumeDeployment,
  pauseResumeActionFor,
  isDeploymentBusy,
  isDeploymentGone,
  resolveStreamEndOutcome,
  type StreamEndSource,
} from '@/services/deployment-lifecycle.service'
import type { Task } from '@/types'

describe('lifecycle matrix', () => {
  it.each([
    ['success', true, true, false, 'pause'],
    ['paused', true, false, true, 'resume'],
    ['pause_failed', true, true, true, 'pause'],
    ['resume_failed', true, true, true, 'resume'],
    ['failed', true, false, false, null],
    ['cancelled', true, false, false, null],
    ['pending', false, false, false, null],
    ['running', false, false, false, null],
    ['destroying', false, false, false, null],
    ['pausing', false, false, false, null],
    ['resuming', false, false, false, null],
    [undefined, false, false, false, null],
  ] as const)('%s → delete %s, pause %s, resume %s, action %s', (status, del, pause, resume, action) => {
    expect(canDeleteDeployment(status)).toBe(del)
    expect(canPauseDeployment(status)).toBe(pause)
    expect(canResumeDeployment(status)).toBe(resume)
    expect(pauseResumeActionFor(status)).toBe(action)
  })

  it('lists the delete statuses in the disabled tooltip', () => {
    expect(DELETE_DISABLED_REASON).toBe(
      'Delete available when status is success, failed, cancelled, paused, pause_failed, resume_failed',
    )
  })
})

describe('isDeploymentBusy', () => {
  const idle = { deploymentStatus: 'success', activeTaskStatus: 'success', latestTaskStatus: 'success' }

  it('is false when everything is terminal or unknown', () => {
    expect(isDeploymentBusy(idle)).toBe(false)
    expect(isDeploymentBusy({ deploymentStatus: undefined, activeTaskStatus: undefined, latestTaskStatus: undefined })).toBe(false)
  })

  it.each(['deploymentStatus', 'activeTaskStatus', 'latestTaskStatus'] as const)('is true while %s is live', (field) => {
    expect(isDeploymentBusy({ ...idle, [field]: 'running' })).toBe(true)
    expect(isDeploymentBusy({ ...idle, [field]: 'pending' })).toBe(true)
  })

  it('does not treat pausing/destroying deployments as busy', () => {
    expect(isDeploymentBusy({ ...idle, deploymentStatus: 'pausing' })).toBe(false)
  })
})

describe('isDeploymentGone', () => {
  it('is true without a current deployment or for another id', () => {
    expect(isDeploymentGone(null, 'dep-1')).toBe(true)
    expect(isDeploymentGone({ deploymentId: 'dep-2' }, 'dep-1')).toBe(true)
    expect(isDeploymentGone({ deploymentId: 'dep-1' }, 'dep-1')).toBe(false)
  })
})

describe('resolveStreamEndOutcome', () => {
  const task = (type: Task['type'], status: Task['status']) => ({ type, status }) as Task
  const base: StreamEndSource = {
    gone: false,
    wasDestroy: false,
    newestTask: undefined,
    lastActiveType: undefined,
    lastActiveStatus: undefined,
  }

  it('reports a gone deployment first', () => {
    expect(resolveStreamEndOutcome({ ...base, gone: true, wasDestroy: true })).toBe('gone')
  })

  it('reports a failed destroy when the row still exists', () => {
    expect(resolveStreamEndOutcome({ ...base, wasDestroy: true, newestTask: task('pause', 'failed') })).toBe('destroy_failed')
  })

  it('reports a failed pause/resume from the newest task', () => {
    expect(resolveStreamEndOutcome({ ...base, newestTask: task('pause', 'failed') })).toBe('pause_failed')
    expect(resolveStreamEndOutcome({ ...base, newestTask: task('resume', 'failed') })).toBe('resume_failed')
  })

  it('falls back to the pre-refetch snapshot', () => {
    expect(resolveStreamEndOutcome({
      ...base, newestTask: task('deploy', 'success'), lastActiveType: 'resume', lastActiveStatus: 'failed',
    })).toBe('resume_failed')
  })

  it('reports nothing for successful runs', () => {
    expect(resolveStreamEndOutcome({ ...base, newestTask: task('pause', 'success'), lastActiveType: 'pause', lastActiveStatus: 'running' })).toBeNull()
  })
})
