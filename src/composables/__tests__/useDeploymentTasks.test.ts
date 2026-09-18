import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const taskApi = vi.hoisted(() => ({ listByDeployment: vi.fn(), getById: vi.fn() }))
vi.mock('@/api/task.api', () => ({ taskApi }))

import { useDeploymentTasks } from '@/composables/useDeploymentTasks'
import { useToastStore } from '@/stores/toast.store'
import i18n from '@/i18n'
import type { Task } from '@/types'

const task = (taskId: string, created_at: string, status: Task['status'] = 'success') =>
  ({ taskId, created_at, status, type: 'deploy' }) as Task

describe('useDeploymentTasks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    taskApi.listByDeployment.mockReset()
    taskApi.getById.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('loads tasks for owners and derives the active task', async () => {
    const tasks = [task('old', '2026-01-01T00:00:00Z'), task('run', '2026-01-02T00:00:00Z', 'running')]
    taskApi.listByDeployment.mockResolvedValue({ data: tasks })
    const state = useDeploymentTasks('dep-1', ref(true))

    const pending = state.loadTasks()
    expect(state.loadingTasks.value).toBe(true)
    await pending

    expect(taskApi.listByDeployment).toHaveBeenCalledWith('dep-1')
    expect(state.tasks.value).toEqual(tasks)
    expect(state.activeTask.value?.taskId).toBe('run')
    expect(state.loadingTasks.value).toBe(false)
  })

  it('skips loading for members and clears the list', async () => {
    const state = useDeploymentTasks('dep-1', ref(false))
    state.tasks.value = [task('x', '2026-01-01T00:00:00Z')]

    await state.loadTasks()

    expect(taskApi.listByDeployment).not.toHaveBeenCalled()
    expect(state.tasks.value).toEqual([])
  })

  it('keeps the previous list when loading fails', async () => {
    taskApi.listByDeployment.mockRejectedValue(new Error('boom'))
    const state = useDeploymentTasks('dep-1', ref(true))
    state.tasks.value = [task('x', '2026-01-01T00:00:00Z')]

    await state.loadTasks()

    expect(state.tasks.value).toHaveLength(1)
    expect(console.error).toHaveBeenCalledWith('Error loading tasks:', expect.any(Error))
  })

  it('loads the newest task as outputs source and prefers a selected task', async () => {
    taskApi.listByDeployment.mockResolvedValue({
      data: [task('old', '2026-01-01T00:00:00Z'), task('new', '2026-02-01T00:00:00Z')],
    })
    taskApi.getById.mockImplementation(async (id: string) => ({ data: { ...task(id, 'x'), outputs: id } }))
    const state = useDeploymentTasks('dep-1', ref(true))
    await state.loadTasks()

    await state.loadLatestTaskOutputs()
    expect(taskApi.getById).toHaveBeenCalledWith('new')
    expect(state.latestTaskOutputs.value?.taskId).toBe('new')
    expect(state.activeDataTask.value?.taskId).toBe('new')

    await state.selectTask(task('old', '2026-01-01T00:00:00Z'))
    expect(state.selectedTask.value?.taskId).toBe('old')
    expect(state.activeDataTask.value?.taskId).toBe('old')

    state.deselectTask()
    expect(state.activeDataTask.value?.taskId).toBe('new')
  })

  it('does not request outputs without tasks and logs a failed seed', async () => {
    const state = useDeploymentTasks('dep-1', ref(true))
    await state.loadLatestTaskOutputs()
    expect(taskApi.getById).not.toHaveBeenCalled()

    state.tasks.value = [task('t', '2026-01-01T00:00:00Z')]
    taskApi.getById.mockRejectedValue(new Error('nope'))
    await state.loadLatestTaskOutputs()
    expect(state.latestTaskOutputs.value).toBeNull()
    expect(console.error).toHaveBeenCalledWith('Error seeding top outputs:', expect.any(Error))
  })

  it('shows a toast when a task detail cannot be loaded', async () => {
    taskApi.getById.mockRejectedValue(new Error('nope'))
    const state = useDeploymentTasks('dep-1', ref(true))

    await state.selectTask(task('t', '2026-01-01T00:00:00Z'))

    expect(state.selectedTask.value).toBeNull()
    expect(state.loadingTaskDetail.value).toBe(false)
    expect(useToastStore().toasts.map(({ type, message }) => ({ type, message }))).toEqual([
      { type: 'error', message: i18n.global.t('DeploymentDetailView.taskDetailLoadError') },
    ])
  })
})
