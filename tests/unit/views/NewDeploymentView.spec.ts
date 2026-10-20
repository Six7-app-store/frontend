/**
 * The wizard shell around the three steps: both entry points, the stepper,
 * back/next, the deep-link guard and the draft surviving a reload. The steps
 * themselves are stubbed; each has its own spec.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'

import NewDeploymentView from '@/views/NewDeploymentView.vue'
import { ROUTE_NAMES } from '@/router/route-names'
import { wizardGuard } from '@/router/wizard-guard'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { DRAFT_STORAGE_KEY } from '@/services/draft-storage.service'
import de from '@/i18n/locales/de'
import { deploymentApi } from '@/api/deployment.api'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
vi.mock('@/api/deployment.api', () => ({ deploymentApi: { create: vi.fn() } }))

enableAutoUnmount(afterEach)

const Empty = defineComponent({ render: () => h('div') })
const stepStub = (name: string) => defineComponent({ name, emits: ['change-app', 'reason'], render: () => h('div', { 'data-testid': name }) })

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/deployment/new/:step(app|target|start)?', name: ROUTE_NAMES.deploymentNew, component: NewDeploymentView, beforeEnter: wizardGuard },
      { path: '/apps/:id', name: ROUTE_NAMES.appsDetail, component: Empty },
      { path: '/deployments', name: ROUTE_NAMES.deploymentsList, component: Empty },
      { path: '/deployments/:id', name: ROUTE_NAMES.deploymentsDetail, component: Empty },
      { path: '/user/openstack', name: ROUTE_NAMES.userOpenStack, component: Empty },
    ],
  })
}

const fromAppPage = () =>
  useDeploymentStore().startDraft({ appId: 'app-1', appName: 'Online-IDE', releaseTag: 'v1.2.0' })

async function open(path: string, { credentials = true, before = () => {} } = {}) {
  const router = makeRouter()
  useOpenStackCredentialsStore().status = { has_credential: credentials } as never
  before()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(NewDeploymentView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'de', messages: { de } })],
      stubs: { StepApp: stepStub('StepApp'), StepTarget: stepStub('StepTarget'), StepStart: stepStub('StepStart') },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

const stepLabels = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-testid="wizard-step-label"]').map((li) => li.text())

describe('NewDeploymentView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  it('startet von „Neues Deployment“ mit drei Schritten beim App-Schritt', async () => {
    const { wrapper, router } = await open('/deployment/new')

    expect(router.currentRoute.value.params.step).toBe('app')
    expect(stepLabels(wrapper)).toEqual(['App', 'Für wen?', 'Aufgabe & Start'])
    expect(wrapper.find('[aria-current="step"]').text()).toContain('App')
    expect(wrapper.find('[data-testid="wizard-step-count"]').text()).toBe('Schritt 1 von 3')
    expect(wrapper.find('[data-testid="StepApp"]').exists()).toBe(true)
  })

  it('startet von der App-Seite mit App und Version beim Schritt „Für wen?“, zwei Schritte', async () => {
    const { wrapper, router } = await open('/deployment/new/target', { before: fromAppPage })

    expect(router.currentRoute.value.params.step).toBe('target')
    expect(stepLabels(wrapper)).toEqual(['Für wen?', 'Aufgabe & Start'])
    expect(wrapper.find('[data-testid="wizard-step-count"]').text()).toBe('Schritt 1 von 2')
    const draft = useDeploymentStore().draft
    expect([draft.entry, draft.appId, draft.releaseTag]).toEqual(['app', 'app-1', 'v1.2.0'])
  })

  it('sperrt „Weiter“ mit sichtbarem Grund, bis der Schritt vollständig ist', async () => {
    const { wrapper, router } = await open('/deployment/new')
    const next = wrapper.get('[data-testid="btn-next"]')

    expect(next.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="wizard-block-reason"]').text()).toBe('Wähle eine App.')

    const store = useDeploymentStore()
    store.draft.appId = 'app-1'
    store.draft.releaseTag = 'v1.0.0'
    await flushPromises()
    expect(wrapper.find('[data-testid="wizard-block-reason"]').exists()).toBe(false)

    await next.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params.step).toBe('target')
    expect(wrapper.find('[data-testid="StepTarget"]').exists()).toBe(true)
  })

  it('leitet einen Direktlink hinter eine Lücke auf den ersten offenen Schritt', async () => {
    const { router } = await open('/deployment/new/start')
    expect(router.currentRoute.value.params.step).toBe('app')
  })

  it('behält den Draft nach einem Reload mitten im Wizard', async () => {
    const first = await open('/deployment/new/target', { before: fromAppPage })
    useDeploymentStore().draft.name = 'Mein Deployment'
    await flushPromises()
    first.wrapper.unmount()
    expect(JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!).releaseTag).toBe('v1.2.0')

    // A reload: fresh Pinia, the store reads the draft back.
    setActivePinia(createPinia())
    const { router } = await open('/deployment/new/target')
    expect(router.currentRoute.value.params.step).toBe('target')
    const draft = useDeploymentStore().draft
    expect([draft.entry, draft.appId, draft.releaseTag, draft.name]).toEqual(['app', 'app-1', 'v1.2.0', 'Mein Deployment'])
  })

  it('führt mit „Abbrechen“ zurück, woher der Wizard kam', async () => {
    const fromCatalog = await open('/deployment/new')
    expect(fromCatalog.wrapper.get('[data-testid="btn-back"]').text()).toBe('Abbrechen')
    await fromCatalog.wrapper.get('[data-testid="btn-back"]').trigger('click')
    await flushPromises()
    expect(fromCatalog.router.currentRoute.value.name).toBe(ROUTE_NAMES.deploymentsList)

    const fromApp = await open('/deployment/new/target', { before: fromAppPage })
    await fromApp.wrapper.get('[data-testid="btn-back"]').trigger('click')
    await flushPromises()
    expect(fromApp.router.currentRoute.value.fullPath).toBe('/apps/app-1')
  })

  it('wechselt mit „Ändern“ auf den App-Schritt und hat dann drei Schritte', async () => {
    const { wrapper, router } = await open('/deployment/new/target', { before: fromAppPage })

    wrapper.findComponent({ name: 'StepTarget' }).vm.$emit('change-app')
    await flushPromises()

    expect(router.currentRoute.value.params.step).toBe('app')
    expect(stepLabels(wrapper)).toHaveLength(3)
    expect(wrapper.get('[data-testid="btn-back"]').text()).toBe('Abbrechen')
  })

  it('zeigt ohne Zugangsdaten das Banner statt des Wizards', async () => {
    const { wrapper } = await open('/deployment/new', { credentials: false })

    expect(wrapper.text()).toContain(de.common.missingCreds.title)
    expect(wrapper.find('[data-testid="StepApp"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="btn-next"]').exists()).toBe(false)
  })

  describe('Start', () => {
    const ready = () => {
      fromAppPage()
      Object.assign(useDeploymentStore().draft, { name: 'Lab', studentIds: ['u1'], groupMode: 'one' })
    }

    it('sperrt „Deployment starten“ mit dem Grund, den der Schritt meldet', async () => {
      const { wrapper } = await open('/deployment/new/start', { before: ready })
      const next = wrapper.get('[data-testid="btn-next"]')
      expect(next.text()).toBe('Deployment starten')

      wrapper.findComponent({ name: 'StepStart' }).vm.$emit('reason', { key: 'deployment.wizard.block.missingFiles', params: { n: 2 }, plural: 2 })
      await flushPromises()
      expect(next.attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="wizard-block-reason"]').text()).toBe('Es fehlen noch 2 Dateien.')
    })

    it('legt das Deployment an, öffnet seine Detailseite und verwirft den Draft', async () => {
      vi.mocked(deploymentApi.create).mockResolvedValue({ data: { deploymentId: 'dep-9' } } as never)
      const { wrapper, router } = await open('/deployment/new/start', { before: ready })

      await wrapper.get('[data-testid="btn-next"]').trigger('click')
      await flushPromises()

      expect(deploymentApi.create).toHaveBeenCalledWith(expect.objectContaining({ appId: 'app-1', releaseTag: 'v1.2.0', name: 'Lab' }))
      expect(router.currentRoute.value.fullPath).toBe('/deployments/dep-9')
      expect(useDeploymentStore().draft.appId).toBeNull()
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
      expect(toast.success).toHaveBeenCalled()
    })

    it('bleibt bei einem Fehler im Wizard, mit Draft und Fehlermeldung', async () => {
      vi.mocked(deploymentApi.create).mockRejectedValue({ response: { status: 422, data: { detail: { reason: 'required_missing', missing: [] } } } })
      const { wrapper, router } = await open('/deployment/new/start', { before: ready })

      await wrapper.get('[data-testid="btn-next"]').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.params.step).toBe('start')
      expect(useDeploymentStore().draft.appId).toBe('app-1')
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
