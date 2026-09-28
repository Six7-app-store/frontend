<script setup lang="ts">
/**
 * "Tasks & Logs" card of the deployment detail page. Members get a
 * placeholder; owners see the task history (without the task that is
 * currently shown in the live card) or, once a task is opened, its
 * ``DeploymentTaskDetail``.
 *
 * Owns ``showTaskLogsTrace`` so the "technical details" toggle keeps its
 * state when switching between tasks.
 */
import { ref } from 'vue'
import { AlertCircle, ChevronDown, CircleArrowLeft, Loader2, Terminal } from 'lucide-vue-next'
import DeploymentTaskDetail from '@/components/deployment/DeploymentTaskDetail.vue'
import { formatDateTime } from '@/utils/format'
import { getStatusStyles } from '@/utils/deployment-status-styles'
import type { Task } from '@/types'

defineProps<{
  isOwnerView: boolean
  /** A live task is shown in its own card — the list is its history. */
  isStreamRelevant: boolean
  historyTasks: Task[]
  loadingTasks: boolean
  selectedTask: Task | null
  loadingTaskDetail: boolean
  activeDataTask: Task | null
}>()

defineEmits<{
  (e: 'select', task: Task): void
  (e: 'deselect'): void
}>()

const showTaskLogsTrace = ref(false)
</script>

<template>
  <div v-if="!isOwnerView" class="bg-panel rounded-xl border border-subtle p-6 shadow-sm">
    <div class="flex items-center gap-3 mb-3">
      <div class="p-2 bg-line/[.07] rounded-lg">
        <Terminal :size="20" class="text-icon" />
      </div>
      <span class="text-lg font-semibold text-fg">{{ $t('DeploymentDetailView.tasksAndLogs') }}</span>
    </div>
    <div class="text-sm text-fg-muted flex items-start gap-2 px-2">
      <AlertCircle :size="16" class="text-icon mt-0.5 flex-shrink-0" />
      <span>{{ $t('DeploymentDetailView.tasksOwnerOnly') }}</span>
    </div>
  </div>
  <div v-else class="bg-panel rounded-xl border border-subtle p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-line/[.07] rounded-lg">
          <Terminal :size="20" class="text-icon" />
        </div>
        <span class="text-lg font-semibold text-fg">
          {{ isStreamRelevant ? $t('DeploymentDetailView.taskHistory') : $t('DeploymentDetailView.tasksAndLogs') }}
        </span>
        <span v-if="historyTasks.length > 0"
          class="px-2 py-0.5 bg-line/[.07] text-fg-muted text-xs font-bold rounded">
          {{ historyTasks.length }}
        </span>
      </div>
      <button v-if="selectedTask" @click="$emit('deselect')"
        class="flex items-center gap-2 text-fg hover:text-accent-fg transition-colors text-sm">
        <CircleArrowLeft :size="16" />
        <span>{{ $t('DeploymentDetailView.backToTaskList') }}</span>
      </button>
    </div>

    <!-- Task List View -->
    <div v-if="!selectedTask">
      <div v-if="loadingTasks" class="flex justify-center py-10">
        <Loader2 class="animate-spin text-icon" :size="32" />
      </div>

      <div v-else-if="historyTasks.length === 0" class="text-center py-10 text-fg-muted">
        {{ isStreamRelevant ? $t('DeploymentDetailView.noPreviousTasks') : $t('DeploymentDetailView.noTasks') }}
      </div>

      <div v-else class="space-y-2">
        <div v-for="task in historyTasks" :key="task.taskId" @click="$emit('select', task)"
          class="flex items-center justify-between p-4 bg-line/[.04] rounded-lg hover:bg-line/[.07] transition-colors cursor-pointer border border-subtle hover:border-strong">
          <div class="flex items-center gap-4 flex-1">
            <component :is="getStatusStyles(task.status).icon" :size="18" :class="task.status === 'success' ? 'text-success' :
              task.status === 'failed' ? 'text-danger' :
                task.status === 'running' ? 'text-fg-muted' : 'text-warning'" />
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <span class="font-medium text-fg capitalize">{{ task.type }}</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize"
                  :class="getStatusStyles(task.status).badgeClass">
                  {{ task.status }}
                </span>
              </div>
              <div class="text-xs text-fg-muted">
                Created: {{ formatDateTime(task.created_at) }}
              </div>
            </div>
          </div>
          <ChevronDown :size="20" class="text-icon transform -rotate-90" />
        </div>
      </div>
    </div>

    <!-- Task Detail View -->
    <DeploymentTaskDetail v-else
      :selected-task="selectedTask"
      :loading-task-detail="loadingTaskDetail"
      :active-data-task="activeDataTask"
      :show-task-logs-trace="showTaskLogsTrace"
      @toggle-trace="showTaskLogsTrace = !showTaskLogsTrace" />
  </div>
</template>
