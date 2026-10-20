import { computed, ref, watch } from 'vue'
import { useRouter, useRoute, onBeforeRouteUpdate } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ROUTE_NAMES } from '@/router/route-names'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useToast } from '@/composables/useToast'
import { wizardGuard } from '@/router/wizard-guard'
import { formatSubmitError } from '@/services/deployment-submit-error.service'
import { draftBlockReason, isWizardStep, stepsFor, type WizardStep } from '@/services/wizard-steps.service'

/** Why the wizard cannot go on: an i18n key and its parameters. */
export interface BlockReason {
  key: string
  params?: Record<string, unknown>
  /** Count for plural forms. */
  plural?: number
}

/**
 * Navigation of the deployment wizard on top of the draft: which steps this
 * run has, where it stands, why the current step cannot be left forward,
 * starting the deployment, and keeping the draft in sessionStorage while
 * the wizard is open.
 *
 * A step that knows more reasons than the draft (the start step's required
 * inputs and files) reports them through ``stepReason``.
 */
export function useDeploymentWizard() {
  const route = useRoute()
  const router = useRouter()
  const store = useDeploymentStore()
  const toast = useToast()
  const { t } = useI18n()

  const steps = computed(() => stepsFor(store.draft.entry))
  const current = computed<WizardStep>(() => {
    const step = route.params.step
    return isWizardStep(step) ? step : steps.value[0]!
  })
  const index = computed(() => Math.max(steps.value.indexOf(current.value), 0))
  const isLast = computed(() => index.value === steps.value.length - 1)

  /** A reason only the current step knows; reset on every step change. */
  const stepReason = ref<BlockReason | null>(null)
  watch(current, () => { stepReason.value = null })

  const blockReason = computed<BlockReason | null>(() => {
    const key = draftBlockReason(current.value, store.draft)
    return key ? { key } : stepReason.value
  })

  const starting = ref(false)
  // Set once the deployment exists: the draft is done and must not be stored again.
  let finished = false

  const goTo = (step: WizardStep) => router.push({ name: ROUTE_NAMES.deploymentNew, params: { step } })

  function next() {
    if (blockReason.value) return
    if (isLast.value) return start()
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

  /**
   * Creates the deployment and opens its page, where the progress runs. The
   * draft is dropped only once the wizard has been left, so nothing on the
   * way re-validates an emptied draft.
   */
  async function start() {
    if (starting.value || blockReason.value) return
    starting.value = true
    try {
      const deployment = await store.submitDraft()
      toast.success(t('deployment.wizard.started'))
      finished = true
      await router.replace({ name: ROUTE_NAMES.deploymentsDetail, params: { id: deployment.deploymentId } })
      store.resetDraft()
    } catch (err) {
      toast.error(formatSubmitError(err, t))
    } finally {
      starting.value = false
    }
  }

  // Param changes within the route skip ``beforeEnter``; the history buttons
  // must not reach a step the draft is not ready for either.
  onBeforeRouteUpdate((to) => wizardGuard(to))

  watch(() => store.draft, () => { if (!finished) store.persistDraft() }, { deep: true, immediate: true })

  return { steps, current, index, isLast, blockReason, stepReason, starting, next, back, changeApp, start }
}
