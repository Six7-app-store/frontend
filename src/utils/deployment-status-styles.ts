/**
 * Status presentation for deployments and tasks on the detail page.
 *
 * :func:`getStatusStyles` maps a deployment/task status to its i18n label
 * key, Tailwind classes (status dot, text, badge) and lucide icon.
 */
import { AlertCircle, CheckCircle, Clock, Flame, Loader2, PauseCircle, StopCircle, XCircle } from 'lucide-vue-next'

export function getStatusStyles(status?: string) {
  switch (status) {
    case 'success':
      return {
        label: 'DeploymentsView.deploymentSuccessful',
        dotClass: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle
      }
    case 'running':
      return {
        label: 'DeploymentsView.deploymentRunning',
        dotClass: 'bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.6)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: Loader2
      }
    case 'pending':
      return {
        label: 'DeploymentsView.deploymentPending',
        dotClass: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: Clock
      }
    case 'failed':
      return {
        label: 'DeploymentsView.deploymentFailed',
        dotClass: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        icon: XCircle
      }
    case 'destroying':
      return {
        label: 'DeploymentsView.deploymentDestroying',
        dotClass: 'bg-orange-500 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.6)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-orange-100 text-orange-700 border-orange-300',
        icon: Loader2
      }
    case 'cancelled':
      return {
        label: 'DeploymentsView.deploymentCancelled',
        dotClass: 'bg-gray-400',
        textClass: 'text-gray-900',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: StopCircle
      }
    case 'destroyed':
      return {
        label: 'DeploymentsView.deploymentDestroyed',
        dotClass: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: Flame
      }
    case 'pausing':
      return {
        // ``pausing``/``resuming`` borrow the orange "in flight"
        // palette from destroying — the user reads "something
        // active is happening" at a glance, distinct from the
        // calm green of success.
        label: 'DeploymentsView.deploymentPausing',
        dotClass: 'bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: Loader2
      }
    case 'paused':
      return {
        label: 'DeploymentsView.deploymentPaused',
        dotClass: 'bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.4)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: PauseCircle
      }
    case 'resuming':
      return {
        label: 'DeploymentsView.deploymentResuming',
        dotClass: 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: Loader2
      }
    case 'pause_failed':
      // The deployment itself is unaffected — only the
      // pause-pass tripped. Use the warning palette so the
      // user reads "needs attention" rather than the harsher
      // red of a deploy-failed.
      return {
        label: 'DeploymentsView.deploymentPauseFailed',
        dotClass: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        icon: AlertCircle
      }
    case 'resume_failed':
      return {
        label: 'DeploymentsView.deploymentResumeFailed',
        dotClass: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
        textClass: 'text-gray-900',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        icon: AlertCircle
      }
    default:
      return {
        label: 'DeploymentsView.noStatus',
        dotClass: 'bg-gray-300',
        textClass: 'text-gray-400',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: AlertCircle
      }
  }
}
