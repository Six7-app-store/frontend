import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useToastStore } from '@/stores/toast.store'
import type { ConnectionState } from '@/composables/useDeploymentStream'
import {
  DELETE_DISABLED_REASON,
  canDeleteDeployment,
  canPauseDeployment,
  canResumeDeployment,
  isDeploymentGone,
  pauseResumeActionFor,
  resolveStreamEndOutcome,
  type PauseResumeAction,
} from '@/services/deployment-lifecycle.service'
import { sortTasksNewestFirst } from '@/services/deployment-tasks.service'
import { extractErrorMessage } from '@/utils/http-error'
import type { DeploymentWithRelations, Task } from '@/types'

export interface DeploymentLifecycleOptions {
  deploymentId: string
  deployment: Ref<DeploymentWithRelations | null>
  isOwnerView: Ref<boolean>
  tasks: Ref<Task[]>
  activeTask: Ref<Task | null>
  /** Live-stream connection state; ``'ended'`` triggers the outcome handling. */
  connectionState: Ref<ConnectionState>
  /** Reloads the task list so the live stream can attach to a new task. */
  loadTasks: () => Promise<void>
}

/**
 * Lifecycle actions of the deployment detail page: Delete and the dynamic
 * Pause/Resume button (availability, confirmation modals, handlers) plus
 * the reaction once a lifecycle task's live stream has ended.
 *
 * Must be called after ``useDeploymentLiveStream`` so the stream-ended
 * watcher registers after the stream's own watchers.
 */
export function useDeploymentLifecycle(options: DeploymentLifecycleOptions) {
  const { deploymentId, deployment, isOwnerView, tasks, activeTask, connectionState, loadTasks } = options
  const { t } = useI18n()
  const router = useRouter()
  const deploymentStore = useDeploymentStore()
  const toastStore = useToastStore()

  // Lifecycle action gating — the status matrix lives in
  // ``services/deployment-lifecycle.service``. Members can never act on
  // lifecycle, so every action is additionally gated on ``isOwnerView``.
  const canDelete = computed(() => isOwnerView.value && canDeleteDeployment(deployment.value?.status))

  const deleteDisabledReason = computed(() => canDelete.value ? '' : DELETE_DISABLED_REASON)

  // One Pause/Resume button — what it does depends on status.
  const canPause = computed(() => isOwnerView.value && canPauseDeployment(deployment.value?.status))
  const canResume = computed(() => isOwnerView.value && canResumeDeployment(deployment.value?.status))
  const canPauseOrResume = computed(() => canPause.value || canResume.value)
  const pauseResumeAction = computed<PauseResumeAction | null>(() => pauseResumeActionFor(deployment.value?.status))

  const showDeleteModal = ref(false)
  const showPauseResumeModal = ref(false)
  const pauseResumeBusy = ref(false)

  // When the SSE stream ends (terminal lifecycle event), reload the deployment +
  // tasks so the view switches from the live progress bar to the static render.
  //
  // Special case: a successful destroy auto-soft-deletes the deployment, so the
  // row disappears. Detected either via the last active task being a terminal
  // DESTROY, or via the refetch returning no current deployment (the store
  // swallows the 404 into ``state.error``, so we check ``currentDeployment``).
  watch(connectionState, async (state) => {
    if (state !== 'ended') return

    const wasDestroy = activeTask.value?.type === 'destroy'
    // Snapshot the active task BEFORE the refetch so we can decide
    // whether to fire a pause/resume failure toast even when the
    // refresh races and clears the live state.
    const lastActiveType = activeTask.value?.type
    const lastActiveStatus = activeTask.value?.status

    await deploymentStore.fetchDeploymentById(deploymentId)
    await loadTasks()

    // Decide what happened (see ``resolveStreamEndOutcome``): a gone row
    // means the destroy succeeded, a remaining row after a destroy means
    // it failed, otherwise a failed pause/resume gets its own toast.
    const outcome = resolveStreamEndOutcome({
      gone: isDeploymentGone(deploymentStore.currentDeployment, deploymentId),
      wasDestroy,
      newestTask: sortTasksNewestFirst(tasks.value || [])[0],
      lastActiveType,
      lastActiveStatus,
    })

    if (outcome === 'gone') {
      // Soft-deleted upstream — the destroy ran clean.
      toastStore.addToast({
        type: 'success',
        message: t('DeploymentDetailView.deleteSuccessToast'),
      })
      router.push({ name: 'deployments.list' })
      return
    }

    // Destroy attempted but the row still exists → it failed. Show a clear
    // error toast and leave the user on the detail page to inspect the logs.
    if (outcome === 'destroy_failed') {
      toastStore.addToast({
        type: 'error',
        message: t('DeploymentDetailView.deleteFailedAsyncToast'),
      })
      return
    }

    // Pause/Resume failed asynchronously. The toast is kept separate from the
    // logs panel to give a clear "the lifecycle pass failed but the deployment
    // is still up" hint without pulling raw exception text into the toast.
    if (outcome === 'pause_failed') {
      toastStore.addToast({
        type: 'error',
        message: t('DeploymentDetailView.pauseFailedAsyncToast'),
      })
    } else if (outcome === 'resume_failed') {
      toastStore.addToast({
        type: 'error',
        message: t('DeploymentDetailView.resumeFailedAsyncToast'),
      })
    }
  })

  // Unified delete handler. The backend's DELETE endpoint returns 202
  // when it dispatched a destroy task (live progress to follow) or 204
  // when it soft-deleted directly (no resources to clean up). Branch
  // on response.status so the UX matches what's actually happening:
  //   * 202 → stay on the page, refresh tasks so the live stream
  //     attaches to the new DESTROY task; the stream-ended
  //     watcher routes back to the list when the task completes.
  //   * 204 → leave immediately with a success toast.
  const confirmDelete = async () => {
    if (!deploymentId) return
    try {
      const response = await deploymentStore.deleteDeployment(deploymentId)
      if (response?.status === 202) {
        // Destroy task dispatched. Reload deployment + tasks so
        // ``activeTask`` flips to the new DESTROY row and the
        // live-progress card swaps in.
        toastStore.addToast({
          type: 'info',
          message: t('DeploymentDetailView.deleteStartedToast'),
        })
        await deploymentStore.fetchDeploymentById(deploymentId)
        await loadTasks()
      } else {
        // 204: nothing to destroy, soft-delete completed
        // synchronously. Row is gone — back to the list.
        toastStore.addToast({
          type: 'success',
          message: t('DeploymentDetailView.deleteSuccessToast'),
        })
        router.push({ name: 'deployments.list' })
      }
    } catch (err: any) {
      toastStore.addToast({
        type: 'error',
        message: `${t('DeploymentDetailView.deleteErrorToast')}: ` + extractErrorMessage(err),
      })
    } finally {
      showDeleteModal.value = false
    }
  }

  // Pause / resume handler — same wiring as ``confirmDelete``: the
  // backend returns 202 with a ``task_id`` when it dispatched the
  // worker, so we just reload the deployment + tasks and the existing
  // SSE stream / activeTask plumbing takes over from there. The button
  // itself is hidden while ``pausing``/``resuming`` so the user can't
  // double-click; ``pauseResumeBusy`` debounces the in-flight HTTP call
  // in case the click lands faster than the deployment status refresh.
  const confirmPauseResume = async () => {
    if (!deploymentId || pauseResumeBusy.value) return
    const action = pauseResumeAction.value
    if (!action) return
    pauseResumeBusy.value = true
    try {
      const call = action === 'pause'
        ? deploymentStore.pauseDeployment(deploymentId)
        : deploymentStore.resumeDeployment(deploymentId)
      await call
      toastStore.addToast({
        type: 'info',
        message: action === 'pause'
          ? t('DeploymentDetailView.pauseStartedToast')
          : t('DeploymentDetailView.resumeStartedToast'),
      })
      await deploymentStore.fetchDeploymentById(deploymentId)
      await loadTasks()
    } catch (err: any) {
      toastStore.addToast({
        type: 'error',
        message: (action === 'pause'
          ? t('DeploymentDetailView.pauseErrorToast')
          : t('DeploymentDetailView.resumeErrorToast'))
          + ': '
          + extractErrorMessage(err),
      })
    } finally {
      pauseResumeBusy.value = false
      showPauseResumeModal.value = false
    }
  }

  return {
    canDelete,
    deleteDisabledReason,
    canPauseOrResume,
    pauseResumeAction,
    showDeleteModal,
    showPauseResumeModal,
    pauseResumeBusy,
    confirmDelete,
    confirmPauseResume,
  }
}
