import type { RouteLocationNormalized } from 'vue-router'
import { ROUTE_NAMES } from '@/router/route-names'
import { useDeploymentStore } from '@/stores/deployment.store'
import { canShowStep, furthestReachableStep, isWizardStep, stepsFor } from '@/services/wizard-steps.service'

/**
 * Entry and deep-link guard of the deployment wizard.
 *
 * ``/deployment/new`` without a step starts a fresh run: plain from
 * "Neues Deployment", or with ``?app=&version=`` from an app page, which
 * skips the app step. With a step (a reload, the browser history) the
 * stored draft is kept, and a step the draft cannot reach yet falls back to
 * the furthest one it can.
 */
export function wizardGuard(to: RouteLocationNormalized) {
  const store = useDeploymentStore()
  const step = to.params.step
  if (!step) {
    const appId = typeof to.query.app === 'string' && to.query.app ? to.query.app : null
    const version = typeof to.query.version === 'string' ? to.query.version : ''
    store.startDraft(appId ? { appId, releaseTag: version } : null)
    return { name: ROUTE_NAMES.deploymentNew, params: { step: stepsFor(store.draft.entry)[0] }, replace: true }
  }
  if (isWizardStep(step) && canShowStep(step, store.draft)) return true
  const fallback = furthestReachableStep(stepsFor(store.draft.entry), store.draft)
  return { name: ROUTE_NAMES.deploymentNew, params: { step: fallback }, replace: true }
}
