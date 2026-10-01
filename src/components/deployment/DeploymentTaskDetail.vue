<script setup lang="ts">
/**
 * Detail of one task from the task history: metadata, logs (with the
 * friendly failure headline and collapsible technical details) and the
 * terraform state, each with a copy button.
 *
 * ``showTaskLogsTrace`` is owned by the parent so the toggle survives
 * switching between tasks; copy buttons share the page-wide "just
 * copied" state (``injectCopyToClipboard``).
 */
import { computed } from 'vue'
import { AlertCircle, Check, Copy, Loader2, Settings, Terminal } from 'lucide-vue-next'
import { injectCopyToClipboard } from '@/composables/useCopyToClipboard'
import { formatDateTime as formatDate } from '@/utils/format'
import { getStatusStyles } from '@/utils/deployment-status-styles'
import { prettyJson, highlightJson } from '@/utils/json-display'
import { countLogEntries, splitTaskLogs, countTfResources } from '@/utils/task-logs'
import type { Task } from '@/types'

const props = defineProps<{
  selectedTask: Task
  loadingTaskDetail: boolean
  /** Task whose data blocks are shown (the selected task, else the newest). */
  activeDataTask: Task | null
  showTaskLogsTrace: boolean
}>()

defineEmits<{
  (e: 'toggle-trace'): void
}>()

const { copiedKey, copyToClipboard } = injectCopyToClipboard()

// Counts the resources in the selected task's state for the header
// sub-headline (``countTfResources`` in ``utils/task-logs``).
const tfResourcesCount = computed(() => countTfResources(props.selectedTask?.tf_state))

// Count of log entries inside ``selectedTask.logs`` for the badge in
// the Logs card header; ``null`` hides the badge. The wire shapes are
// documented on ``countLogEntries`` in ``utils/task-logs``.
const logEntryCount = computed<number | null>(() => countLogEntries(props.selectedTask?.logs))

// ``logs`` can be either a backend-formatted ``Task failed: ...`` string
// (the failure shape this splitter cares about) or a structured
// ``TaskLogsObject`` for normal runs. Only the string form triggers the
// headline/details split — anything else falls through to the generic
// pretty-print path below.
const taskLogsSplit = computed(() => {
  const raw = props.selectedTask?.logs
  return splitTaskLogs(typeof raw === 'string' ? raw : null)
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="loadingTaskDetail" class="flex justify-center py-10">
      <Loader2 class="animate-spin text-icon" :size="32" />
    </div>

    <div v-else>
      <div class="bg-line/[.04] rounded-lg p-4 border border-subtle mb-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.taskType') }}</div>
            <div class="text-sm font-medium text-fg capitalize">{{ selectedTask.type }}</div>
          </div>
          <div>
            <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.taskStatus') }}</div>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize"
              :class="getStatusStyles(selectedTask.status).badgeClass">
              {{ selectedTask.status }}
            </span>
          </div>
          <div>
            <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.taskStarted') }}</div>
            <div class="text-sm text-fg">{{ formatDate(selectedTask.started_at) }}</div>
          </div>
          <div>
            <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.taskFinished') }}</div>
            <div class="text-sm text-fg">{{ formatDate(selectedTask.finished_at) }}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <div>
            <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.taskId') }}</div>
            <div class="text-xs font-mono text-fg bg-panel px-2 py-1 rounded">{{
              selectedTask.taskId
            }}</div>
          </div>
          <div>
            <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.celeryTaskId') }}</div>
            <div class="text-xs font-mono text-fg bg-panel px-2 py-1 rounded">{{
              selectedTask.celeryTaskId }}</div>
          </div>
          <div>
            <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.taskCreatedAt') }}</div>
            <div class="text-sm text-fg">{{ formatDate(selectedTask.created_at) }}</div>
          </div>
        </div>
      </div>

      <!-- Logs — same simple ``<pre>`` rendering as the
                         Terraform State and Outputs blocks below. The
                         previous formatted/raw toggle plus numbered
                         entry cards added a lot of UI surface for
                         little extra information; pretty-printed JSON
                         is uniform and lets the browser handle search
                         (Cmd+F) consistently across all three blocks. -->
      <div v-if="selectedTask.logs" class="mb-4">
        <div class="bg-panel rounded-lg border border-subtle overflow-hidden">
          <div
            class="bg-line/[.04] px-4 py-3 border-b border-subtle flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="p-1.5 bg-panel rounded-md border border-strong">
                <Terminal :size="16" class="text-icon" />
              </div>
              <span class="font-semibold text-fg">{{ $t('DeploymentDetailView.logs') }}</span>
              <span v-if="logEntryCount !== null"
                class="px-2 py-0.5 bg-line/[.07] text-fg text-xs font-bold rounded border border-strong">
                {{ logEntryCount }} {{ $t('DeploymentDetailView.logEntries') }}
              </span>
            </div>
            <button @click="copyToClipboard(prettyJson(selectedTask.logs), 'logs')"
              :title="copiedKey === 'logs' ? $t('DeploymentDetailView.copied') : $t('DeploymentDetailView.copyToClipboard')"
              class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors"
              :class="copiedKey === 'logs'
                ? 'status-success'
                : 'bg-panel text-fg border-strong hover:bg-line/[.04]'">
              <component :is="copiedKey === 'logs' ? Check : Copy" :size="13" />
              {{ copiedKey === 'logs' ? $t('DeploymentDetailView.copiedShort') : $t('DeploymentDetailView.copyShort') }}
            </button>
          </div>
          <div class="bg-line/[.04] p-4 overflow-y-auto max-h-[500px]">
            <div class="bg-panel rounded-lg border border-subtle p-4">
              <!-- Failure case: for a backend-formatted
                                         ``Task failed: ...`` string, split the
                                         friendly headline (shown in red) from the
                                         technical trace, which hides behind a toggle. -->
              <template v-if="taskLogsSplit.isFailure">
                <div class="flex items-start gap-2 text-sm text-danger mb-3">
                  <AlertCircle :size="18" class="mt-0.5 flex-shrink-0" />
                  <div class="font-medium leading-relaxed whitespace-pre-wrap">{{ taskLogsSplit.headline }}</div>
                </div>
                <button
                  v-if="taskLogsSplit.details"
                  type="button"
                  class="text-xs text-fg-muted hover:text-fg underline mb-2"
                  @click="$emit('toggle-trace')"
                >
                  {{ showTaskLogsTrace ? $t('DeploymentDetailView.hideTechnicalDetails') : $t('DeploymentDetailView.showTechnicalDetails') }}
                </button>
                <pre
                  v-if="showTaskLogsTrace && taskLogsSplit.details"
                  class="text-fg font-mono text-xs leading-relaxed whitespace-pre-wrap"
                >{{ taskLogsSplit.details }}</pre>
              </template>
              <pre v-else class="text-fg font-mono text-xs leading-relaxed whitespace-pre-wrap" v-html="highlightJson(prettyJson(selectedTask.logs))"></pre>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="mb-4">
        <div class="bg-panel rounded-lg border border-subtle overflow-hidden">
          <div class="bg-line/[.04] px-4 py-3 border-b border-subtle">
            <div class="flex items-center gap-2">
              <Terminal :size="16" class="text-icon" />
              <span class="font-semibold text-fg">{{ $t('DeploymentDetailView.logs') }}</span>
            </div>
          </div>
          <div class="text-center py-8 text-fg-muted">
            <Terminal :size="32" class="mx-auto mb-2 text-icon" />
            <p class="text-sm">{{ $t('DeploymentDetailView.noLogs') }}</p>
          </div>
        </div>
      </div>

      <div v-if="activeDataTask?.tf_state" class="mb-4">
        <div class="bg-panel rounded-lg border border-subtle overflow-hidden shadow-sm">

          <div
            class="bg-line/[.04] px-4 py-3 border-b border-subtle flex items-center justify-between select-none">
            <div class="flex items-center gap-2">
              <div class="p-1.5 bg-panel rounded-md border border-subtle">
                <Settings :size="16" class="text-icon" />
              </div>
              <div class="flex flex-col text-left">
                <span class="font-semibold text-fg">{{
                  $t('DeploymentDetailView.terraformState')
                  }}</span>
                <span class="text-xs text-fg-muted">
                  {{ tfResourcesCount > 0 ? $t('DeploymentDetailView.terraformResourcesCount', { count: tfResourcesCount }) :
                    $t('DeploymentDetailView.advancedDetails') }}
                </span>
              </div>
            </div>

            <button @click="copyToClipboard(prettyJson(activeDataTask?.tf_state), 'tf_state')"
              :title="copiedKey === 'tf_state' ? $t('DeploymentDetailView.copied') : $t('DeploymentDetailView.copyToClipboard')"
              class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex-shrink-0"
              :class="copiedKey === 'tf_state'
                ? 'status-success'
                : 'bg-panel text-fg border-strong hover:bg-line/[.04]'">
              <component :is="copiedKey === 'tf_state' ? Check : Copy" :size="13" />
              {{ copiedKey === 'tf_state' ? $t('DeploymentDetailView.copiedShort') : $t('DeploymentDetailView.copyShort') }}
            </button>
          </div>

          <div class="bg-panel p-4 overflow-y-auto max-h-[500px]">
            <div
              class="font-mono text-xs leading-relaxed text-left whitespace-pre-wrap select-text">
              <pre v-html="highlightJson(prettyJson(activeDataTask.tf_state))"></pre>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>
