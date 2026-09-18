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
import { formatDateTime as formatDate } from '@/utils/format'
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
  <div v-if="!isOwnerView" class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
    <div class="flex items-center gap-3 mb-3">
      <div class="p-2 bg-gray-100 rounded-lg">
        <Terminal :size="20" class="text-gray-400" />
      </div>
      <span class="text-lg font-semibold text-gray-700">{{ $t('DeploymentDetailView.tasksAndLogs') }}</span>
    </div>
    <div class="text-sm text-gray-500 flex items-start gap-2 px-2">
      <AlertCircle :size="16" class="text-gray-400 mt-0.5 flex-shrink-0" />
      <span>{{ $t('DeploymentDetailView.tasksOwnerOnly') }}</span>
    </div>
  </div>
  <div v-else class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-gray-100 rounded-lg">
          <Terminal :size="20" class="text-gray-600" />
        </div>
        <span class="text-lg font-semibold text-gray-900">
          {{ isStreamRelevant ? $t('DeploymentDetailView.taskHistory') : $t('DeploymentDetailView.tasksAndLogs') }}
        </span>
        <span v-if="historyTasks.length > 0"
          class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded">
          {{ historyTasks.length }}
        </span>
      </div>
      <button v-if="selectedTask" @click="$emit('deselect')"
        class="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm">
        <CircleArrowLeft :size="16" />
        <span>{{ $t('DeploymentDetailView.backToTaskList') }}</span>
      </button>
    </div>

    <!-- Task List View -->
    <div v-if="!selectedTask">
      <div v-if="loadingTasks" class="flex justify-center py-10">
        <Loader2 class="animate-spin text-primary" :size="32" />
      </div>

      <div v-else-if="historyTasks.length === 0" class="text-center py-10 text-gray-500">
        {{ isStreamRelevant ? $t('DeploymentDetailView.noPreviousTasks') : $t('DeploymentDetailView.noTasks') }}
      </div>

      <div v-else class="space-y-2">
        <div v-for="task in historyTasks" :key="task.taskId" @click="$emit('select', task)"
          class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 hover:border-primary/30">
          <div class="flex items-center gap-4 flex-1">
            <component :is="getStatusStyles(task.status).icon" :size="18" :class="task.status === 'success' ? 'text-green-600' :
              task.status === 'failed' ? 'text-red-600' :
                task.status === 'running' ? 'text-blue-600' : 'text-yellow-600'" />
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <span class="font-medium text-gray-900 capitalize">{{ task.type }}</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize"
                  :class="getStatusStyles(task.status).badgeClass">
                  {{ task.status }}
                </span>
              </div>
              <div class="text-xs text-gray-500">
                Created: {{ formatDate(task.created_at) }}
              </div>
            </div>
          </div>
          <ChevronDown :size="20" class="text-gray-400 transform -rotate-90" />
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
