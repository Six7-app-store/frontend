import type { RouteLocationNormalized } from 'vue-router'
import { ROUTE_NAMES } from '@/router/route-names'
import { useDeploymentStore } from '@/stores/deployment.store'
import { canShowStep, furthestReachableStep, isWizardStep, stepsFor } from '@/services/wizard-steps.service'

/**
 * Entry and deep-link guard of the deployment wizard.
 *
 * ``/deployment/new`` without a step starts a fresh run from "Neues
 * Deployment". An app page starts its run itself (``store.startDraft`` with
 * app and version) and opens a step directly. With a step (also a reload
 * or the browser history) the draft is kept, and a step it cannot reach
 * yet falls back to the furthest one it can.
 */
export function wizardGuard(to: RouteLocationNormalized) {
  const store = useDeploymentStore()
  const step = to.params.step
  if (!step) {
    store.startDraft()
    return { name: ROUTE_NAMES.deploymentNew, params: { step: stepsFor(store.draft.entry)[0] }, replace: true }
  }
  if (isWizardStep(step) && canShowStep(step, store.draft)) return true
  const fallback = furthestReachableStep(stepsFor(store.draft.entry), store.draft)
  return { name: ROUTE_NAMES.deploymentNew, params: { step: fallback }, replace: true }
}
