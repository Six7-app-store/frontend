/**
 * Status presentation for deployments and tasks on the detail page.
 *
 * :func:`getStatusStyles` maps a deployment/task status to its i18n label
 * key, Tailwind classes (status dot, text, badge) and lucide icon.
 *
 * The palette has four status tones: green (running/success), yellow
 * (in flight or needs attention), red (failed) and grey (neutral/idle).
 */
import { AlertCircle, CheckCircle, Clock, Flame, Loader2, PauseCircle, StopCircle, XCircle } from 'lucide-vue-next'

export function getStatusStyles(status?: string) {
  switch (status) {
    case 'success':
      return {
        label: 'DeploymentsView.deploymentSuccessful',
        iconClass: 'text-success',
        badgeClass: 'status-success',
        icon: CheckCircle
      }
    case 'running':
      return {
        label: 'DeploymentsView.deploymentRunning',
        iconClass: 'text-fg-muted',
        badgeClass: 'status-success',
        icon: Loader2
      }
    case 'pending':
      return {
        label: 'DeploymentsView.deploymentPending',
        iconClass: 'text-warning',
        badgeClass: 'status-neutral',
        icon: Clock
      }
    case 'failed':
      return {
        label: 'DeploymentsView.deploymentFailed',
        iconClass: 'text-danger',
        badgeClass: 'status-danger',
        icon: XCircle
      }
    case 'destroying':
      return {
        label: 'DeploymentsView.deploymentDestroying',
        iconClass: 'text-warning',
        badgeClass: 'status-warning',
        icon: Loader2
      }
    case 'cancelled':
      return {
        label: 'DeploymentsView.deploymentCancelled',
        iconClass: 'text-warning',
        badgeClass: 'status-neutral',
        icon: StopCircle
      }
    case 'destroyed':
      return {
        label: 'DeploymentsView.deploymentDestroyed',
        iconClass: 'text-warning',
        badgeClass: 'status-neutral',
        icon: Flame
      }
    case 'pausing':
      return {
        // ``pausing``/``resuming`` share the yellow "in flight" tone with
        // destroying — the user reads "something active is happening" at a
        // glance, distinct from the calm green of success.
        label: 'DeploymentsView.deploymentPausing',
        iconClass: 'text-warning',
        badgeClass: 'status-warning',
        icon: Loader2
      }
    case 'paused':
      return {
        label: 'DeploymentsView.deploymentPaused',
        iconClass: 'text-warning',
        badgeClass: 'status-neutral',
        icon: PauseCircle
      }
    case 'resuming':
      return {
        label: 'DeploymentsView.deploymentResuming',
        iconClass: 'text-warning',
        badgeClass: 'status-warning',
        icon: Loader2
      }
    case 'pause_failed':
      // The deployment itself is unaffected — only the
      // pause-pass tripped. Use the warning tone so the
      // user reads "needs attention" rather than the harsher
      // red of a deploy-failed.
      return {
        label: 'DeploymentsView.deploymentPauseFailed',
        iconClass: 'text-warning',
        badgeClass: 'status-warning',
        icon: AlertCircle
      }
    case 'resume_failed':
      return {
        label: 'DeploymentsView.deploymentResumeFailed',
        iconClass: 'text-warning',
        badgeClass: 'status-warning',
        icon: AlertCircle
      }
    default:
      return {
        label: 'DeploymentsView.noStatus',
        iconClass: 'text-warning',
        badgeClass: 'status-neutral',
        icon: AlertCircle
      }
  }
}
