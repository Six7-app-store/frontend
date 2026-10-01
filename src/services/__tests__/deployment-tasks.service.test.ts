import { describe, it, expect } from 'vitest'

import {
  isLiveTaskStatus,
  sortTasksNewestFirst,
  findActiveTask,
  selectHistoryTasks,
} from '@/services/deployment-tasks.service'
import type { Task } from '@/types'

const task = (taskId: string, created_at: string, status: Task['status'] = 'success'): Task => ({
  taskId,
  deploymentId: 'dep-1',
  celeryTaskId: `celery-${taskId}`,
  type: 'deploy',
  status,
  started_at: null,
  finished_at: null,
  logs: null,
  tf_state: null,
  outputs: null,
  current_phase: null,
  progress_pct: null,
  created_at,
})

describe('isLiveTaskStatus', () => {
  it('is true only for pending and running', () => {
    expect(isLiveTaskStatus('pending')).toBe(true)
    expect(isLiveTaskStatus('running')).toBe(true)
    expect(isLiveTaskStatus('success')).toBe(false)
    expect(isLiveTaskStatus(undefined)).toBe(false)
  })
})

describe('sortTasksNewestFirst', () => {
  it('returns a sorted copy without mutating the input', () => {
    const input = [task('a', '2026-01-01T00:00:00Z'), task('b', '2026-02-01T00:00:00Z')]
    expect(sortTasksNewestFirst(input).map((t) => t.taskId)).toEqual(['b', 'a'])
    expect(input.map((t) => t.taskId)).toEqual(['a', 'b'])
  })
})

describe('findActiveTask', () => {
  it('returns null without tasks', () => {
    expect(findActiveTask([])).toBeNull()
  })

  it('prefers the newest live task', () => {
    const tasks = [
      task('old-running', '2026-01-01T00:00:00Z', 'running'),
      task('newest-done', '2026-03-01T00:00:00Z'),
      task('pending', '2026-02-01T00:00:00Z', 'pending'),
    ]
    expect(findActiveTask(tasks)?.taskId).toBe('pending')
  })

  it('falls back to the newest task when all are terminal', () => {
    const tasks = [task('a', '2026-01-01T00:00:00Z', 'failed'), task('b', '2026-02-01T00:00:00Z')]
    expect(findActiveTask(tasks)?.taskId).toBe('b')
  })
})

describe('selectHistoryTasks', () => {
  const tasks = [task('a', '2026-01-01T00:00:00Z'), task('b', '2026-02-01T00:00:00Z', 'running')]

  it('hides the active task while the stream is relevant', () => {
    expect(selectHistoryTasks(tasks, tasks[1]!, true).map((t) => t.taskId)).toEqual(['a'])
  })

  it('lists all tasks newest first otherwise', () => {
    expect(selectHistoryTasks(tasks, tasks[1]!, false).map((t) => t.taskId)).toEqual(['b', 'a'])
    expect(selectHistoryTasks(tasks, null, true).map((t) => t.taskId)).toEqual(['b', 'a'])
  })
})
