import { computed, ref, type Ref } from 'vue'
import { taskApi } from '@/api/task.api'
import { useToast } from '@/composables/useToast'
import { findActiveTask, sortTasksNewestFirst } from '@/services/deployment-tasks.service'
import type { Task } from '@/types'

/**
 * Task state of the deployment detail page: the task list, the "active"
 * task, the task opened in the history detail and the outputs of the
 * newest task (which feed the Teams card for owners).
 *
 * Tasks are owner-only; for members every loader is a no-op.
 */
export function useDeploymentTasks(deploymentId: string, isOwnerView: Ref<boolean>) {
  const toast = useToast()

  const tasks = ref<Task[]>([])
  const loadingTasks = ref(false)
  const selectedTask = ref<Task | null>(null)
  const loadingTaskDetail = ref(false)
  const latestTaskOutputs = ref<Task | null>(null)

  // Always returns the currently active data task for the UI blocks.
  const activeDataTask = computed(() => selectedTask.value || latestTaskOutputs.value)

  // The "active" task is the one we still expect events from, falling
  // back to the newest task (see ``findActiveTask``).
  const activeTask = computed<Task | null>(() => findActiveTask(tasks.value))

  const loadTasks = async () => {
    // Members can't read tasks (backend returns 403 for the
    // owner-only endpoint). Skip the call entirely so the network
    // tab stays clean and the UI doesn't briefly flicker a loader
    // for data we'll never receive.
    if (!isOwnerView.value) {
      tasks.value = []
      return
    }
    loadingTasks.value = true
    try {
      const { data } = await taskApi.listByDeployment(deploymentId)
      tasks.value = data
    } catch (err) {
      // Deliberately silent: the previous list stays visible and the
      // next refresh (stream end, lifecycle action) retries.
      console.error('Error loading tasks:', err)
    } finally {
      loadingTasks.value = false
    }
  }

  // Owner view: seed the top outputs from the latest task so the
  // page can render the summary before the first SSE event arrives.
  // Expects ``loadTasks`` to have run.
  const loadLatestTaskOutputs = async () => {
    if (tasks.value && tasks.value.length > 0) {
      const sortedTasks = sortTasksNewestFirst(tasks.value)

      const latestTask = sortedTasks[0]

      if (latestTask) {
        // Fetch the details straight from the API into latestTaskOutputs.
        try {
          const { data } = await taskApi.getById(latestTask.taskId)
          latestTaskOutputs.value = data
        } catch (err) {
          // Deliberately silent: without outputs the Teams card just shows
          // no credentials; the rest of the page is unaffected.
          console.error('Error seeding top outputs:', err)
        }
      }
    }
  }

  const selectTask = async (task: Task) => {
    loadingTaskDetail.value = true
    try {
      const { data } = await taskApi.getById(task.taskId)
      selectedTask.value = data
    } catch (err) {
      console.error('Error loading task details:', err)
      toast.error('Failed to load task details')
    } finally {
      loadingTaskDetail.value = false
    }
  }

  const deselectTask = () => {
    selectedTask.value = null
  }

  return {
    tasks,
    loadingTasks,
    activeTask,
    selectedTask,
    loadingTaskDetail,
    latestTaskOutputs,
    activeDataTask,
    loadTasks,
    loadLatestTaskOutputs,
    selectTask,
    deselectTask,
  }
}
