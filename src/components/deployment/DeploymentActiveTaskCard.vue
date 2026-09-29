<script setup lang="ts">
/**
 * Live card for the currently running task on the deployment detail page:
 * task type, start time and stream connection badge, progress headline,
 * phase stepper and the live log tail.
 *
 * Pure presentation — all values come from ``useDeploymentLiveStream``,
 * whose ``live`` object is passed in as one prop.
 */
import { Loader2 } from 'lucide-vue-next'
import { formatDateTime } from '@/utils/format'
import { phaseLabel } from '@/services/deployment-phases.service'
import type { LiveTaskView } from '@/composables/useDeploymentLiveStream'
import type { Task } from '@/types'

defineProps<{
  activeTask: Task
  live: LiveTaskView
}>()
</script>

<template>
  <div class="bg-panel rounded-xl border border-strong shadow-sm overflow-hidden">
    <!-- Header strip: live indicator + task type/status -->
    <div class="bg-line/[.04] px-6 py-4 border-b border-subtle">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-2.5 h-2.5 bg-success-dot rounded-full"></div>
            <div class="absolute inset-0 w-2.5 h-2.5 bg-success-dot rounded-full animate-ping"></div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-fg capitalize">{{ activeTask.type
              }}</span>
              <span class="text-xs font-medium text-fg-muted">·</span>
              <span class="text-xs text-fg-muted">{{ $t('DeploymentDetailView.runningSince', {
                time: formatDateTime(activeTask.started_at || activeTask.created_at) }) }}</span>
            </div>
            <div class="text-xs text-fg-muted font-mono mt-0.5">{{ activeTask.taskId }}</div>
          </div>
        </div>
        <span class="text-xs px-2 py-1 rounded-md font-medium" :class="live.connectionState === 'live'
          ? 'bg-success-dot/10 text-success border border-success-dot/30'
          : live.connectionState === 'reconnecting'
            ? 'bg-warning-dot/10 text-warning border border-warning-dot/30'
            : 'bg-line/[.07] text-fg-muted border border-subtle'">
          {{ $t(`DeploymentDetailView.streamState.${live.connectionState}`) }}
        </span>
      </div>
    </div>

    <!-- Body: progress bar + phase stepper + live tail -->
    <div class="p-6 space-y-5">
      <!-- The "Worker is starting up" loader covers the very
                     first seconds of a fresh task, before any phase
                     info is available — neither the SSE stream nor
                     the DB-seeded ``current_phase`` is set yet.
                     ``live.phaseIndex`` carries either the
                     authoritative live value or the percent-derived
                     guess from the DB seed, so checking it alone is
                     enough to decide whether to render the stepper. -->
      <template v-if="live.phaseIndex === null && !live.phase">
        <div class="flex items-center gap-3 py-6 justify-center text-fg-muted">
          <Loader2 class="animate-spin" :size="20" />
          <span class="text-sm">{{ $t('DeploymentDetailView.workerStarting') }}</span>
        </div>
      </template>
      <template v-else>
        <!-- Progress headline -->
        <div>
          <div class="flex items-baseline justify-between mb-2">
            <span class="text-base font-semibold text-fg">
              {{ phaseLabel(live.phase) || $t('DeploymentDetailView.phaseStarting') }}
            </span>
            <span class="text-2xl font-bold text-fg tabular-nums">
              {{ live.progress ?? 0 }}<span class="text-sm text-fg-muted font-medium">%</span>
            </span>
          </div>
          <div class="w-full bg-line/[.07] rounded-full h-2 overflow-hidden">
            <div class="meter-fill-low h-2 rounded-tag transition-all duration-500 ease-out"
              :style="{ width: (live.progress ?? 0) + '%' }"></div>
          </div>
        </div>

        <!-- Phase stepper. Renders ``live.stepCount`` dots based
                         on the live ``totalPhases``, with labels picked by
                         the live total (matches deploy/destroy presets).
                         Generous ``py-3`` padding prevents the active
                         dot's ``ring-4`` + ``scale-125`` halo from clipping
                         against the parent's bottom edge. -->
        <div class="flex items-start gap-1.5 overflow-x-auto py-3">
          <template v-for="idx in live.stepCount" :key="idx - 1">
            <div class="flex-shrink-0 flex flex-col items-center gap-2 min-w-[60px]">
              <div class="w-2.5 h-2.5 rounded-full transition-all" :class="(idx - 1) < live.activeStepIndex
                ? 'bg-icon'
                : (idx - 1) === live.activeStepIndex
                  ? 'bg-icon ring-4 ring-accent/30 scale-125'
                  : 'bg-line/[.12]'"></div>
              <span
                class="text-[10px] uppercase tracking-wide font-medium whitespace-nowrap text-center"
                :class="(idx - 1) <= live.activeStepIndex ? 'text-fg' : 'text-fg-muted'">
                {{ live.stepLabel(idx - 1) }}
              </span>
            </div>
            <div v-if="(idx - 1) < live.stepCount - 1" class="flex-1 h-px min-w-[8px] mt-[5px]"
              :class="(idx - 1) < live.activeStepIndex ? 'bg-line/[.18]' : 'bg-line/[.12]'"></div>
          </template>
        </div>
      </template>

      <!-- Live log tail. ``live.totalLogCount`` keeps
                     growing past the visible buffer (capped at 100
                     lines via the ring buffer in the composable),
                     so the user sees that the worker is still
                     producing output even after the box is full. -->
      <div v-if="live.logs.length > 0" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase tracking-wide font-semibold text-fg-muted">{{ $t('DeploymentDetailView.liveOutput') }}</span>
          <span class="text-xs text-fg-muted">
            {{ live.totalLogCount.toLocaleString() }} {{ live.totalLogCount === 1 ? $t('DeploymentDetailView.logLine') : $t('DeploymentDetailView.logLines')
            }}
            <span v-if="live.logs.length < live.totalLogCount" class="text-fg-muted">
              · {{ $t('DeploymentDetailView.lastShown', { count: live.logs.length }) }}
            </span>
          </span>
        </div>
        <div class="surface-sunken p-3 max-h-72 overflow-y-auto font-mono text-xs">
          <div v-for="(log, idx) in live.logs" :key="`${log.timestamp}-${idx}`"
            class="text-icon whitespace-pre-wrap break-words" :class="{
              'text-danger': log.level === 'ERROR',
              'text-warning': log.level === 'WARNING',
              'text-success': log.level === 'SUCCESS',
              'text-fg-muted': log.streaming,
            }">
            <span class="text-fg-muted mr-2">{{ log.timestamp.split('T')[1]?.slice(0, 8) || '' }}</span>
            <span v-if="log.tool" class="text-fg-muted mr-1">[{{ log.tool }}]</span>{{ log.message }}
          </div>
        </div>
      </div>
      <div v-else class="bg-line/[.04] border border-subtle rounded-md p-4 text-center text-xs text-fg-muted">
        {{ $t('DeploymentDetailView.waitingForLogs') }}
      </div>
    </div>
  </div>
</template>
