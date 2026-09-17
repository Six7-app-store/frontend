import { computed, onScopeDispose, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { deploymentApi } from '@/api/deployment.api'
import { useToast } from '@/composables/useToast'
import { getErrorReason, getErrorStatus } from '@/utils/http-error'
import { isDeploymentBusy as isBusy } from '@/services/deployment-lifecycle.service'
import type { DeploymentWithRelations, Task } from '@/types'

export type ResendState = 'sending' | 'sent' | 'error'

export interface ResendAccessOptions {
  deploymentId: string
  deployment: Ref<DeploymentWithRelations | null>
  activeTask: Ref<Task | null>
}

/**
 * "Resend access" buttons of the Teams card on the deployment detail page:
 * per-user send state, the API call with its toasts, and whether the
 * deployment is currently too busy to send credentials at all.
 */
export function useResendAccess(options: ResendAccessOptions) {
  const { deploymentId, deployment, activeTask } = options
  const { t } = useI18n()
  const toast = useToast()

  // True while the deployment (or its active task) is still moving; keeps
  // the resend-access button disabled until the run is terminal.
  const isDeploymentBusy = computed(() => isBusy({
    deploymentStatus: deployment.value?.status,
    activeTaskStatus: activeTask.value?.status,
    latestTaskStatus: deployment.value?.latest_task?.status,
  }))

  // Per-user resend-access state. Map ``userId → 'sending' | 'sent' | 'error'``
  // so the button can show inline feedback on the row that was clicked
  // without forcing a re-render of the whole list. The 'sent' state
  // auto-clears after 2s so the user can resend again.
  const resendState = ref<Record<string, ResendState>>({})

  // Pending reset timers, cleared when the owning component unmounts.
  const resetTimers = new Set<number>()
  const resetStateLater = (userId: string, delayMs: number) => {
    const timer = window.setTimeout(() => {
      resetTimers.delete(timer)
      const next = { ...resendState.value }
      delete next[userId]
      resendState.value = next
    }, delayMs)
    resetTimers.add(timer)
  }
  onScopeDispose(() => {
    resetTimers.forEach((timer) => window.clearTimeout(timer))
    resetTimers.clear()
  })

  const resendAccess = async (teamId: string, userId: string) => {
    resendState.value = { ...resendState.value, [userId]: 'sending' }
    try {
      await deploymentApi.resendAccess(deploymentId, teamId, userId)
      resendState.value = { ...resendState.value, [userId]: 'sent' }
      toast.success(t('DeploymentDetailView.resendAccessSuccess'))
      resetStateLater(userId, 2000)
    } catch (err: any) {
      resendState.value = { ...resendState.value, [userId]: 'error' }
      // Backend returns ``{detail: {reason: '...'}}``; surface the
      // reason verbatim — the UI doesn't need to localise every
      // possible code, the toast is for the operator.
      //
      // Two reasons get a dedicated toast string so the user
      // understands WHY mail didn't go out:
      //   * smtp_disabled (503): platform-wide kill-switch; needs
      //     an admin to flip ``SMTP_ENABLED`` in the backend env.
      //     A generic "Failed to send" toast would mislead them
      //     into thinking the SMTP server is down.
      //   * deployment_busy (409): a lifecycle task is still running;
      //     the user just has to wait until it has finished.
      //   * everything else: stays in the existing failure path
      //     so SMTP-rejected-the-recipient, transient errors, and
      //     unknown reasons all get the verbose toast.
      const reason = getErrorReason(err) || err?.message || 'unknown'
      const isSmtpDisabled = getErrorStatus(err) === 503 && reason === 'smtp_disabled'
      const isDeploymentBusyErr = getErrorStatus(err) === 409 && reason === 'deployment_busy'
      const message = isSmtpDisabled
        ? t('DeploymentDetailView.resendAccessSmtpDisabled')
        : isDeploymentBusyErr
          ? t('DeploymentDetailView.resendAccessDeploymentBusy')
          : `${t('DeploymentDetailView.resendAccessError')}: ${reason}`
      if (isSmtpDisabled || isDeploymentBusyErr) {
        toast.warning(message)
      } else {
        toast.error(message)
      }
      resetStateLater(userId, 3000)
    }
  }

  return {
    isDeploymentBusy,
    resendState,
    resendAccess,
  }
}
