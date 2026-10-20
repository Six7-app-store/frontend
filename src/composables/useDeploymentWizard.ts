import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router'
import { ROUTE_NAMES } from '@/router/route-names'
import { useDeploymentStore } from '@/stores/deployment.store'
import { wizardGuard } from '@/router/wizard-guard'
import { draftBlockReason, isWizardStep, stepsFor, type WizardStep } from '@/services/wizard-steps.service'

/**
 * Navigation of the deployment wizard on top of the draft: which steps this
 * run has, where it stands, why the current step cannot be left forward,
 * and keeping the draft in sessionStorage while the wizard is open.
 *
 * A step that knows more reasons than the draft (the start step's required
 * inputs) reports them through ``stepReason``.
 */
export function useDeploymentWizard() {
  const route = useRoute()
  const router = useRouter()
  const store = useDeploymentStore()

  const steps = computed(() => stepsFor(store.draft.entry))
  const current = computed<WizardStep>(() => {
    const step = route.params.step
    return isWizardStep(step) ? step : steps.value[0]!
  })
  const index = computed(() => Math.max(steps.value.indexOf(current.value), 0))
  const isLast = computed(() => index.value === steps.value.length - 1)

  /** A reason only the current step knows; reset on every step change. */
  const stepReason = ref<string | null>(null)
  watch(current, () => { stepReason.value = null })

  const blockReason = computed(() => draftBlockReason(current.value, store.draft) ?? stepReason.value)

  const goTo = (step: WizardStep) => router.push({ name: ROUTE_NAMES.deploymentNew, params: { step } })

  function next() {
    if (blockReason.value || isLast.value) return
    return goTo(steps.value[index.value + 1]!)
  }

  /** One step back; on the first step this leaves the wizard where it came from. */
  function back() {
    if (index.value > 0) return goTo(steps.value[index.value - 1]!)
    if (store.draft.entry === 'app' && store.draft.appId) {
      return router.push({ name: ROUTE_NAMES.appsDetail, params: { id: store.draft.appId } })
    }
    return router.push({ name: ROUTE_NAMES.deploymentsList })
  }

  /** "Ändern" on the chosen app: the run now has the app step too. */
  function changeApp() {
    store.draft.entry = 'catalog'
    return goTo('app')
  }

  // Param changes within the route skip ``beforeEnter``; the history buttons
  // must not reach a step the draft is not ready for either.
  onBeforeRouteUpdate((to) => wizardGuard(to))

  watch(() => store.draft, () => { store.persistDraft() }, { deep: true, immediate: true })

  return { steps, current, index, isLast, blockReason, stepReason, next, back, changeApp }
}
