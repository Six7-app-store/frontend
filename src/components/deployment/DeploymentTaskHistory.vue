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
import { AlertCircle, ChevronDown, CircleArrowLeft, Loader2 } from 'lucide-vue-next'
import DeploymentTaskDetail from '@/components/deployment/DeploymentTaskDetail.vue'
import { formatDateTime } from '@/utils/format'
import { getStatusStyles } from '@/utils/deployment-status-styles'
import DeploymentStatusBadge from '@/components/deployment/DeploymentStatusBadge.vue'
import type { Task } from '@/types'
import Card from '@/components/ui/Card.vue'

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
  <Card v-if="!isOwnerView" :title="$t('DeploymentDetailView.tasksAndLogs')">
    <div class="text-sm text-fg-muted flex items-start gap-2 px-2">
      <AlertCircle :size="16" class="text-icon mt-0.5 flex-shrink-0" />
      <span>{{ $t('DeploymentDetailView.tasksOwnerOnly') }}</span>
    </div>
  </Card>
  <Card
    v-else
    :title="isStreamRelevant ? $t('DeploymentDetailView.taskHistory') : $t('DeploymentDetailView.tasksAndLogs')"
    :count="historyTasks.length"
  >
    <template #actions>
      <button v-if="selectedTask" @click="$emit('deselect')"
        class="flex items-center gap-2 text-fg hover:text-heading transition-colors text-sm">
        <CircleArrowLeft :size="16" />
        <span>{{ $t('DeploymentDetailView.backToTaskList') }}</span>
      </button>
    </template>

    <!-- Task List View -->
    <div v-if="!selectedTask">
      <div v-if="loadingTasks" class="flex justify-center py-10">
        <Loader2 class="animate-spin text-icon" :size="32" />
      </div>

      <div v-else-if="historyTasks.length === 0" class="text-center py-10 text-fg-muted">
        {{ isStreamRelevant ? $t('DeploymentDetailView.noPreviousTasks') : $t('DeploymentDetailView.noTasks') }}
      </div>

      <div v-else class="space-y-2">
        <button v-for="task in historyTasks" :key="task.taskId" type="button" data-testid="task-row"
          class="hover-tint flex w-full items-center justify-between rounded-panel border border-subtle p-4 text-left transition-colors hover:border-strong"
          @click="$emit('select', task)">
          <span class="flex flex-1 items-center gap-4">
            <component :is="getStatusStyles(task.status).icon" :size="18" :class="getStatusStyles(task.status).iconClass" aria-hidden="true" />
            <span class="flex-1">
              <span class="mb-1 flex items-center gap-3">
                <span class="font-semibold capitalize text-heading">{{ task.type }}</span>
                <DeploymentStatusBadge :status="task.status" />
              </span>
              <span class="block text-sm text-fg-muted">
                {{ $t('DeploymentDetailView.taskCreatedAt') }}: {{ formatDateTime(task.created_at) }}
              </span>
            </span>
          </span>
          <ChevronDown :size="18" class="-rotate-90 text-disabled" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Task Detail View -->
    <DeploymentTaskDetail v-else
      :selected-task="selectedTask"
      :loading-task-detail="loadingTaskDetail"
      :active-data-task="activeDataTask"
      :show-task-logs-trace="showTaskLogsTrace"
      @toggle-trace="showTaskLogsTrace = !showTaskLogsTrace" />
  </Card>
</template>
