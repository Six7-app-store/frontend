import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'

const stream = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  deploymentIds: [] as Array<string | null>,
}))

vi.mock('@/composables/useDeploymentStream', async () => {
  const { ref: vueRef } = await import('vue')
  return {
    useDeploymentStream: (id: Ref<string | null>) => {
      stream.deploymentIds.push(id.value)
      return {
        progress: vueRef<number | null>(null),
        currentPhase: vueRef<string | null>(null),
        currentPhaseIndex: vueRef<number | null>(null),
        totalPhases: vueRef(11),
        phaseNames: vueRef<string[]>([]),
        liveLogs: vueRef([]),
        totalLogCount: vueRef(0),
        connectionState: vueRef('idle'),
        lastError: vueRef(null),
        start: stream.start,
        stop: stream.stop,
      }
    },
  }
})

import { useDeploymentLiveStream } from '@/composables/useDeploymentLiveStream'
import type { Task } from '@/types'

const task = (overrides: Partial<Task>) =>
  ({ taskId: 't', type: 'deploy', status: 'running', progress_pct: null, current_phase: null, ...overrides }) as Task

const setup = (initial: { owner?: boolean; task?: Task | null } = {}) => {
  const isOwnerView = ref(initial.owner ?? true)
  const activeTask = ref<Task | null>(initial.task ?? null)
  const onStreamFinished = vi.fn()
  let api!: ReturnType<typeof useDeploymentLiveStream>
  const wrapper = mount(defineComponent({
    setup() {
      api = useDeploymentLiveStream({ deploymentId: 'dep-1', isOwnerView, activeTask, onStreamFinished })
      return () => null
    },
  }))
  return { wrapper, api, isOwnerView, activeTask, onStreamFinished }
}

describe('useDeploymentLiveStream', () => {
  beforeEach(() => {
    stream.start.mockReset()
    stream.stop.mockReset()
    stream.deploymentIds = []
  })

  it('connects the stream for the given deployment', () => {
    setup()
    expect(stream.deploymentIds).toEqual(['dep-1'])
  })

  it('starts immediately for a live active task and seeds progress from the DB', () => {
    const { api } = setup({ task: task({ progress_pct: 45, current_phase: 'TERRAFORM_PLAN' }) })

    expect(api.isStreamRelevant.value).toBe(true)
    expect(stream.start).toHaveBeenCalledTimes(1)
    expect(api.progress.value).toBe(45)
    expect(api.currentPhase.value).toBe('TERRAFORM_PLAN')
    expect(api.currentPhaseIndex.value).toBe(5)
    expect(api.activeStepIndex.value).toBe(4)
    expect(api.phaseStepCount.value).toBe(11)
    expect(api.phaseStepLabel(8)).toBe('Terraform Plan')
  })

  it('does not seed from terminal tasks', () => {
    const { api } = setup({ task: task({ status: 'success', progress_pct: 100, current_phase: 'OUTPUTS_AND_CLEANUP' }) })

    expect(stream.start).not.toHaveBeenCalled()
    expect(api.progress.value).toBeNull()
    expect(api.activeStepIndex.value).toBe(-1)
  })

  it('never starts for members', () => {
    const { api } = setup({ owner: false, task: task({}) })

    expect(api.isStreamRelevant.value).toBe(false)
    expect(stream.start).not.toHaveBeenCalled()
  })

  it('stops the stream and reports completion when the task finishes', async () => {
    const { activeTask, onStreamFinished } = setup({ task: task({}) })

    activeTask.value = task({ status: 'success' })
    await nextTick()

    expect(stream.stop).toHaveBeenCalledTimes(1)
    expect(onStreamFinished).toHaveBeenCalledTimes(1)
    expect(stream.stop.mock.invocationCallOrder[0]).toBeLessThan(onStreamFinished.mock.invocationCallOrder[0]!)
  })

  it('starts once a new live task appears', async () => {
    const { activeTask, onStreamFinished } = setup({ task: task({ status: 'success' }) })

    activeTask.value = task({ taskId: 'next', type: 'destroy' })
    await nextTick()

    expect(stream.start).toHaveBeenCalledTimes(1)
    expect(onStreamFinished).not.toHaveBeenCalled()
  })

  it('stops the stream on unmount', () => {
    const { wrapper } = setup()
    wrapper.unmount()
    expect(stream.stop).toHaveBeenCalledTimes(1)
  })
})
