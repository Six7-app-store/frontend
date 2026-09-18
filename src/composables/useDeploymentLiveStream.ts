import { computed, onBeforeUnmount, watch, type Ref } from 'vue'
import { useDeploymentStream } from '@/composables/useDeploymentStream'
import {
  estimatePhaseIndexFromPercent,
  resolveCurrentPhaseIndex,
  resolvePhaseStepCount,
  resolvePhaseStepLabel,
} from '@/services/deployment-phases.service'
import { isLiveTaskStatus } from '@/services/deployment-tasks.service'
import type { Task } from '@/types'

export interface DeploymentLiveStreamOptions {
  deploymentId: string
  isOwnerView: Ref<boolean>
  activeTask: Ref<Task | null>
  /**
   * Called right after the stream was stopped because the active task
   * left ``pending``/``running`` — the place to refresh everything the
   * finished task changed (tasks, resources, …).
   */
  onStreamFinished: () => void
}

/**
 * LIVE STREAM (progress bar + log tail) of the deployment detail page.
 *
 * We attach the SSE stream once there is a live active task and keep it
 * open until the task reaches a terminal state. ``useDeploymentStream``
 * auto-reconnects on transient errors and exposes ``connectionState``
 * for a small status badge.
 *
 * Besides the raw stream refs this returns the stepper values derived
 * from them (dot count, labels, active dot) and seeds progress + phase
 * from the DB while no SSE event has arrived yet.
 */
export function useDeploymentLiveStream(options: DeploymentLiveStreamOptions) {
  const { isOwnerView, activeTask, onStreamFinished } = options

  const deploymentIdRef = computed(() => options.deploymentId)
  const {
    progress,
    currentPhase,
    currentPhaseIndex,
    totalPhases,
    phaseNames,
    liveLogs,
    totalLogCount,
    connectionState,
    start: startStream,
    stop: stopStream,
  } = useDeploymentStream(deploymentIdRef)

  const isStreamRelevant = computed(() => {
    // Members never get the live stream — backend would 403 the SSE
    // endpoint anyway, the gate here just keeps the UI from poking
    // at it. Owners see the stream while there's an active task.
    if (!isOwnerView.value) return false
    return isLiveTaskStatus(activeTask.value?.status)
  })

  // Phase stepper — N dots based on the live ``totalPhases`` reported by
  // the worker, labelled from the worker's ``phase_names`` or the static
  // per-task-type tables. The phase tables and label precedence live in
  // ``services/deployment-phases.service``.
  const phaseStepCount = computed<number>(() => resolvePhaseStepCount(totalPhases.value))

  const phaseStepLabel = (idx: number): string =>
    resolvePhaseStepLabel(idx, {
      phaseNames: phaseNames.value,
      activeTaskType: activeTask.value?.type,
      totalPhases: totalPhases.value,
    })

  // 0-based index of the active dot (worker ``phase_index`` first,
  // ``progress_pct`` as fallback).
  const activeStepIndex = computed<number>(() =>
    resolveCurrentPhaseIndex({
      phaseIndex: currentPhaseIndex.value,
      progress: progress.value,
      stepCount: phaseStepCount.value,
    })
  )

  // Initialise progress bar + stepper from whatever the DB has on the
  // latest task — covers the gap between page load and the first SSE
  // event. Important when the user opens the detail view *mid-deploy*:
  // without a seed they'd see the loader card until the next worker
  // progress event, which can be 30s+ during long phases like
  // ``terraform apply``.
  //
  // Only seed from a *live* task. The persisted progress columns of a
  // finished deploy would otherwise paint the stepper at 100% / phase
  // "OUTPUTS_AND_CLEANUP" right after the user clicks delete, before
  // the new destroy task's first progress event arrives.
  //
  // Registered before the relevance watcher below — keep that order.
  watch(
    activeTask,
    (task) => {
      if (!task) return
      const live = isLiveTaskStatus(task.status)
      if (!live) return
      if (task.progress_pct != null && progress.value === null) {
        progress.value = task.progress_pct
      }
      if (task.current_phase && currentPhase.value === null) {
        currentPhase.value = task.current_phase
        // Approximate the phase index from the persisted percent so the
        // stepper renders meaningfully before the first SSE progress event
        // lands (see ``estimatePhaseIndexFromPercent``).
        if (task.progress_pct != null && currentPhaseIndex.value === null) {
          currentPhaseIndex.value = estimatePhaseIndexFromPercent(
            task.progress_pct,
            totalPhases.value,
          )
        }
      }
    },
    { immediate: true },
  )

  watch(
    isStreamRelevant,
    (relevant, wasRelevant) => {
      if (relevant && !wasRelevant) {
        startStream()
      } else if (!relevant && wasRelevant) {
        stopStream()
        // Refresh what the finished task changed (final logs/outputs,
        // resources after a redeploy, …) — owned by the caller.
        onStreamFinished()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    stopStream()
  })

  return {
    progress,
    currentPhase,
    currentPhaseIndex,
    liveLogs,
    totalLogCount,
    connectionState,
    isStreamRelevant,
    phaseStepCount,
    phaseStepLabel,
    activeStepIndex,
  }
}
