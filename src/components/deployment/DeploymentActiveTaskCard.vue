<script setup lang="ts">
/**
 * Live card for the currently running task on the deployment detail page:
 * task type, start time and stream connection badge, progress headline,
 * phase stepper and the live log tail.
 *
 * Pure presentation — all values come from ``useDeploymentLiveStream``.
 * Prop names match the stream bindings of the view so the template
 * comments below still refer to the right values.
 */
import { Loader2 } from 'lucide-vue-next'
import { formatDateTime as formatDate } from '@/utils/format'
import { phaseLabel } from '@/services/deployment-phases.service'
import type { ConnectionState, LogEntry } from '@/composables/useDeploymentStream'
import type { Task } from '@/types'

defineProps<{
  activeTask: Task
  streamConnectionState: ConnectionState
  /** 1-based phase index from the stream or the DB seed; ``null`` before either. */
  streamCurrentPhaseIndex: number | null
  streamCurrentPhase: string | null
  streamProgress: number | null
  phaseStepCount: number
  phaseStepLabel: (idx: number) => string
  /** 0-based index of the active stepper dot. */
  currentPhaseIndex: number
  streamLiveLogs: LogEntry[]
  streamTotalLogCount: number
}>()
</script>

<template>
  <div class="bg-white rounded-xl border border-blue-300 shadow-sm overflow-hidden">
    <!-- Header strip: gradient + live indicator + task type/status -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
            <div class="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-gray-900 capitalize">{{ activeTask.type
              }}</span>
              <span class="text-xs font-medium text-gray-500">·</span>
              <span class="text-xs text-gray-600">running since {{ formatDate(activeTask.started_at ||
                activeTask.created_at) }}</span>
            </div>
            <div class="text-xs text-gray-500 font-mono mt-0.5">{{ activeTask.taskId }}</div>
          </div>
        </div>
        <span class="text-xs px-2 py-1 rounded-md font-medium" :class="streamConnectionState === 'live'
          ? 'bg-green-100 text-green-700 border border-green-200'
          : streamConnectionState === 'reconnecting'
            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
            : 'bg-gray-100 text-gray-600 border border-gray-200'">
          {{ streamConnectionState === 'live' ? $t('DeploymentDetailView.streamLive') : streamConnectionState }}
        </span>
      </div>
    </div>

    <!-- Body: progress bar + phase stepper + live tail -->
    <div class="p-6 space-y-5">
      <!-- The "Worker is starting up" loader covers the very
                     first seconds of a fresh task, before any phase
                     info is available — neither the SSE stream nor
                     the DB-seeded ``current_phase`` is set yet.
                     ``streamCurrentPhaseIndex`` carries either the
                     authoritative live value or the percent-derived
                     guess from the DB seed, so checking it alone is
                     enough to decide whether to render the stepper. -->
      <template v-if="streamCurrentPhaseIndex === null && !streamCurrentPhase">
        <div class="flex items-center gap-3 py-6 justify-center text-gray-500">
          <Loader2 class="animate-spin" :size="20" />
          <span class="text-sm">{{ $t('DeploymentDetailView.workerStarting') }}</span>
        </div>
      </template>
      <template v-else>
        <!-- Progress headline -->
        <div>
          <div class="flex items-baseline justify-between mb-2">
            <span class="text-base font-semibold text-gray-900">
              {{ phaseLabel(streamCurrentPhase) || $t('DeploymentDetailView.phaseStarting') }}
            </span>
            <span class="text-2xl font-bold text-gray-900 tabular-nums">
              {{ streamProgress ?? 0 }}<span class="text-sm text-gray-500 font-medium">%</span>
            </span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div class="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
              :style="{ width: (streamProgress ?? 0) + '%' }"></div>
          </div>
        </div>

        <!-- Phase stepper. Renders ``phaseStepCount`` dots based
                         on the live ``totalPhases``, with labels picked by
                         the live total (matches deploy/destroy presets).
                         Generous ``py-3`` padding prevents the active
                         dot's ``ring-4`` + ``scale-125`` halo from clipping
                         against the parent's bottom edge. -->
        <div class="flex items-start gap-1.5 overflow-x-auto py-3">
          <template v-for="idx in phaseStepCount" :key="idx - 1">
            <div class="flex-shrink-0 flex flex-col items-center gap-2 min-w-[60px]">
              <div class="w-2.5 h-2.5 rounded-full transition-all" :class="(idx - 1) < currentPhaseIndex
                ? 'bg-blue-500'
                : (idx - 1) === currentPhaseIndex
                  ? 'bg-blue-500 ring-4 ring-blue-200 scale-125'
                  : 'bg-gray-200'"></div>
              <span
                class="text-[10px] uppercase tracking-wide font-medium whitespace-nowrap text-center"
                :class="(idx - 1) <= currentPhaseIndex ? 'text-blue-700' : 'text-gray-400'">
                {{ phaseStepLabel(idx - 1) }}
              </span>
            </div>
            <div v-if="(idx - 1) < phaseStepCount - 1" class="flex-1 h-px min-w-[8px] mt-[5px]"
              :class="(idx - 1) < currentPhaseIndex ? 'bg-blue-300' : 'bg-gray-200'"></div>
          </template>
        </div>
      </template>

      <!-- Live log tail. ``streamTotalLogCount`` keeps
                     growing past the visible buffer (capped at 100
                     lines via the ring buffer in the composable),
                     so the user sees that the worker is still
                     producing output even after the box is full. -->
      <div v-if="streamLiveLogs.length > 0" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase tracking-wide font-semibold text-gray-600">{{ $t('DeploymentDetailView.liveOutput') }}</span>
          <span class="text-xs text-gray-500">
            {{ streamTotalLogCount.toLocaleString() }} {{ streamTotalLogCount === 1 ? $t('DeploymentDetailView.logLine') : $t('DeploymentDetailView.logLines')
            }}
            <span v-if="streamLiveLogs.length < streamTotalLogCount" class="text-gray-400">
              · {{ $t('DeploymentDetailView.lastShown', { count: streamLiveLogs.length }) }}
            </span>
          </span>
        </div>
        <div class="bg-gray-900 rounded-md p-3 max-h-72 overflow-y-auto font-mono text-xs">
          <div v-for="(log, idx) in streamLiveLogs" :key="`${log.timestamp}-${idx}`"
            class="text-gray-200 whitespace-pre-wrap break-words" :class="{
              'text-red-400': log.level === 'ERROR',
              'text-yellow-300': log.level === 'WARNING',
              'text-green-400': log.level === 'SUCCESS',
              'text-gray-400': log.streaming,
            }">
            <span class="text-gray-500 mr-2">{{ log.timestamp.split('T')[1]?.slice(0, 8) || '' }}</span>
            <span v-if="log.tool" class="text-blue-400 mr-1">[{{ log.tool }}]</span>{{ log.message }}
          </div>
        </div>
      </div>
      <div v-else class="bg-gray-50 border border-gray-200 rounded-md p-4 text-center text-xs text-gray-500">
        Waiting for first log line…
      </div>
    </div>
  </div>
</template>
