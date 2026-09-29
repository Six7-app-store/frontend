import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useRouter } from 'vue-router'

// Anpassen an deinen tatsächlichen Dateinamen / Pfad
import DeploymentVariables from '@/views/NewDeploymentVariableView.vue'
// NEU: Die Komponente direkt importieren, um sie sicher im Test zu finden
import VariableInput from '@/components/VariableInput.vue' 

import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToast } from '@/composables/useToast'

// --- MOCKS ---
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn()
  }))
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/composables/useToast', () => ({
  useToast: vi.fn(() => ({
    warning: vi.fn(),
    error: vi.fn(),
    clear: vi.fn(),
    success: vi.fn(),
    info: vi.fn()
  }))
}))

// Mock für den dynamischen Import des OpenStack Caches
vi.mock('@/composables/useOpenStackResourceCache', () => ({
  ensureLoaded: vi.fn().mockResolvedValue(undefined)
}))

describe('NewDeploymentVariableView.vue', () => {
  let routerPushMock: any
  let routerReplaceMock: any
  let toastErrorMock: any

  beforeEach(() => {
    vi.clearAllMocks()
    routerPushMock = vi.fn()
    routerReplaceMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ 
      push: routerPushMock,
      replace: routerReplaceMock
    } as any)
    
    toastErrorMock = vi.fn()
    vi.mocked(useToast).mockReturnValue({
      error: toastErrorMock,
      info: vi.fn(),
      warning: vi.fn(),
      success: vi.fn(),
      clear: vi.fn()
    } as any)
  })

  function createWrapper(draftOverrides: any = {}, mockVariables: any[] = []) {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        deployment: {
          studentCache: new Map(),
          draft: {
            appId: 'app-1',
            name: 'Test Deployment',
            releaseTag: '1.0.0',
            variables: {},
            userInputVar: '',
            variableDefinitions: [],
            fileUploads: {},
            groupNames: ['Team 1'],
            assignments: { 0: ['u1'] },
            ...draftOverrides
          }
        }
      }
    })

    const appStore = useAppStore(pinia)
    appStore.fetchAppVariables = vi.fn().mockResolvedValue(mockVariables)

    return mount(DeploymentVariables, {
      global: {
        plugins: [pinia],
        stubs: {
          DeploymentProgressBar: true,
          VariableInput: true, // FIX: Nutzt jetzt den automatischen Stub von Vue Test Utils
          FileDropZone: true,
          ScopeBadge: true,
          Box: true,
          Layers: true,
          Info: true,
          AlertTriangle: true,
          ArrowRight: true,
          ArrowLeft: true
        }
      }
    })
  }

  it('redirects to /apps if no appId is present in draft', async () => {
    createWrapper({ appId: null })
    await flushPromises()

    expect(routerReplaceMock).toHaveBeenCalledWith({ name: 'apps' })
  })

  it('fetches variables and groups them into packer and terraform sections', async () => {
    const mockVars = [
      { name: 'packer_var', source: 'packer', type: 'string', required: false, default: 'val1' },
      { name: 'tf_var', source: 'terraform', type: 'string', required: false, default: 'val2' }
    ]
    
    const wrapper = createWrapper({}, mockVars)
    await flushPromises() // Warten auf Loading und API-Call

    const appStore = useAppStore()
    expect(appStore.fetchAppVariables).toHaveBeenCalledWith('app-1', '1.0.0')

    // Beiden Sektionen sollten gerendert werden (Namen der Variablen sind sichtbar)
    expect(wrapper.text()).toContain('packer_var')
    expect(wrapper.text()).toContain('tf_var')
  })

  it('blocks navigation if a required variable is missing (Required-Gating)', async () => {
    const mockVars = [
      // Required Variable ohne Default-Wert
      { name: 'db_password', source: 'terraform', type: 'string', required: true }
    ]
    
    const wrapper = createWrapper({}, mockVars)
    await flushPromises()

    // Next-Button sollte im disabled-State sein (Klasse oder Attribut)
    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    expect(nextBtn?.attributes('disabled')).toBeDefined()
    expect(nextBtn?.classes()).toContain('cursor-not-allowed')
    
    // Warnhinweis für fehlende Felder sollte sichtbar sein
    expect(wrapper.text()).toContain('deployment.variables.missingRequiredTitle')
    expect(wrapper.text()).toContain('db_password')
  })

  it('allows navigation and saves variables when required fields are filled', async () => {
    const mockVars = [
      { name: 'db_password', source: 'terraform', type: 'string', required: true }
    ]
    
    const wrapper = createWrapper({}, mockVars)
    await flushPromises()

    const deploymentStore = useDeploymentStore()

    // FIX: VariableInput sicher über den direkten Import finden
    const varInput = wrapper.findComponent(VariableInput)
    await varInput.vm.$emit('update:modelValue', 'secret123')
    
    // Warten, bis Vue die formValues aktualisiert hat und computed properties (canSubmit) neu berechnet
    await wrapper.vm.$nextTick()

    // Next-Button klicken
    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    expect(nextBtn?.attributes('disabled')).toBeUndefined()
    await nextBtn?.trigger('click')

    // Prüfen, ob Store korrekt befüllt wurde (userInputVar als JSON String)
    const expectedChanges = { db_password: 'secret123' }
    expect(deploymentStore.draft.userInputVar).toBe(JSON.stringify(expectedChanges))
    
    // Prüfen, ob weitergeleitet wurde
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployment.summary' })
  })

  it('treats an untouched number variable without default as unchanged', async () => {
    const mockVars = [
      { name: 'port', source: 'terraform', type: 'number', required: false },
      { name: 'host', source: 'terraform', type: 'string', required: false, default: 'localhost' }
    ]

    const wrapper = createWrapper({}, mockVars)
    await flushPromises()

    const deploymentStore = useDeploymentStore()
    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    await nextBtn?.trigger('click')

    expect(deploymentStore.draft.userInputVar).toBe(JSON.stringify({}))
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployment.summary' })
  })

  it('navigates back to the teams step when the back button is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const backBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.back'))
    await backBtn?.trigger('click')

    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployment.teams' })
  })

  it('shows error toast when fetchAppVariables fails', async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        deployment: {
          draft: { appId: 'app-1', variableDefinitions: [] }
        }
      }
    })
    
    const appStore = useAppStore(pinia)
    appStore.fetchAppVariables = vi.fn().mockRejectedValue(new Error('Network Error'))

    mount(DeploymentVariables, {
      global: {
        plugins: [pinia],
        stubs: { DeploymentProgressBar: true, Box: true, Layers: true, ArrowLeft: true, ArrowRight: true }
      }
    })

    await flushPromises()
    
    expect(toastErrorMock).toHaveBeenCalledWith('deployment.summary.fetchVarsError')
  })
})

describe('NewDeploymentVariableView.vue — Charakterisierung', () => {
  let push: ReturnType<typeof vi.fn>
  let toastInfo: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    push = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push, replace: vi.fn() } as any)
    toastInfo = vi.fn()
    vi.mocked(useToast).mockReturnValue({
      error: vi.fn(), info: toastInfo, warning: vi.fn(), success: vi.fn(), clear: vi.fn(),
    } as any)
  })

  const mountView = (draft: Record<string, unknown>, fetched: any[] = [], studentCache = new Map()) => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        deployment: {
          studentCache,
          draft: {
            appId: 'app-1', name: 'Lab', releaseTag: 'v1', variables: {}, userInputVar: '',
            variableDefinitions: [], fileUploads: {}, groupNames: ['Rot'], assignments: { 0: ['u1'] },
            ...draft,
          },
        },
      },
    })
    useAppStore(pinia).fetchAppVariables = vi.fn().mockResolvedValue(fetched)
    return mount(DeploymentVariables, {
      global: {
        plugins: [pinia],
        stubs: { DeploymentProgressBar: true, VariableInput: true, FileDropZone: true, ScopeBadge: true },
      },
    })
  }

  /** inputId → modelValue of every rendered VariableInput. */
  const inputs = (wrapper: ReturnType<typeof mountView>) =>
    Object.fromEntries(wrapper.findAllComponents(VariableInput).map((c) => [c.props('inputId'), c.props('modelValue')]))

  const input = (wrapper: ReturnType<typeof mountView>, id: string) =>
    wrapper.findAllComponents(VariableInput).find((c) => c.props('inputId') === id)!

  const next = async (wrapper: ReturnType<typeof mountView>) => {
    await wrapper.findAll('button').find((b) => b.text().includes('deployment.actions.next'))!.trigger('click')
  }

  it('stellt Werte aus dem Draft wieder her (single image), Listen als Kommatext', async () => {
    const wrapper = mountView({
      variableDefinitions: [
        { name: 'region', source: 'packer', type: 'string', default: 'us' },
        { name: 'tags', source: 'terraform', type: 'list(string)' },
        { name: 'debug', source: 'terraform', type: 'bool', default: false },
      ],
      variables: { region: 'eu', tags: ['a', 'b'] },
    })
    await flushPromises()

    expect(inputs(wrapper)).toEqual({ region: 'eu', tags: 'a, b', debug: false })
  })

  it('stellt Packer-Werte pro Template wieder her und speichert sie verschachtelt (multi image)', async () => {
    const wrapper = mountView({
      variableDefinitions: [
        { name: 'size', source: 'packer', type: 'string', template_key: 'web', default: 'm' },
        { name: 'size', source: 'packer', type: 'string', template_key: 'db', default: 'l' },
      ],
      variables: { packer: { web: { size: 's' } } },
    })
    await flushPromises()
    expect(inputs(wrapper)).toEqual({ 'web.size': 's', 'db.size': 'l' })

    await next(wrapper)
    const store = useDeploymentStore()
    expect(store.draft.variables).toEqual({ packer: { web: { size: 's' }, db: { size: 'l' } } })
    expect(JSON.parse(store.draft.userInputVar as string)).toEqual({ packer: { web: { size: 's' } } })
  })

  it('verteilt den Default einer Team-Variable auf alle Teams und speichert die Slot-Map', async () => {
    const wrapper = mountView(
      { groupNames: ['Rot', 'Blau'], assignments: { 0: ['u1'], 1: ['u2'] } },
      [{ name: 'quota', source: 'terraform', type: 'number', varScope: 'team', default: 5 }],
    )
    await flushPromises()
    expect(inputs(wrapper)).toEqual({ quota__Rot: 5, quota__Blau: 5 })

    await next(wrapper)
    const store = useDeploymentStore()
    expect(store.draft.variables).toEqual({ quota: { Rot: 5, Blau: 5 } })
    expect(JSON.parse(store.draft.userInputVar as string)).toEqual({ quota: { Rot: 5, Blau: 5 } })
  })

  it('wandelt Listen und Zahlen beim Speichern um und merkt nur Abweichungen vom Default', async () => {
    const wrapper = mountView({}, [
      { name: 'tags', source: 'terraform', type: 'list(string)' },
      { name: 'port', source: 'terraform', type: 'number', default: 22 },
      { name: 'host', source: 'terraform', type: 'string', default: 'localhost' },
    ])
    await flushPromises()

    await input(wrapper, 'tags').vm.$emit('update:modelValue', ' a, b ,')
    await input(wrapper, 'port').vm.$emit('update:modelValue', '8080')
    await next(wrapper)

    const store = useDeploymentStore()
    expect(store.draft.variables).toEqual({ tags: ['a', 'b'], port: 8080, host: 'localhost' })
    expect(JSON.parse(store.draft.userInputVar as string)).toEqual({ tags: ['a', 'b'], port: 8080 })
    expect(push).toHaveBeenCalledWith({ name: 'deployment.summary' })
  })

  it('verlangt eine Pflicht-Variable pro Person und nennt die fehlenden Slots', async () => {
    const wrapper = mountView(
      { groupNames: ['Rot'], assignments: { 0: ['u1'] } },
      [{ name: 'login', source: 'terraform', type: 'string', varScope: 'user', required: true }],
      new Map([['u1', { userId: 'u1', username: 'anna' }]]),
    )
    await flushPromises()

    expect(Object.keys(inputs(wrapper))).toEqual(['login__Rot-anna'])
    expect(wrapper.text()).toContain('login (Rot-anna)')
    await input(wrapper, 'login__Rot-anna').vm.$emit('update:modelValue', 'anna01')
    expect(wrapper.text()).not.toContain('deployment.variables.missingRequiredTitle')
  })

  it('verwirft Slot-Werte umbenannter Teams und meldet das', async () => {
    const wrapper = mountView(
      { groupNames: ['Rot'], assignments: { 0: ['u1'] } },
      [{ name: 'login', source: 'terraform', type: 'string', varScope: 'user' }],
      new Map([['u1', { userId: 'u1', username: 'anna' }]]),
    )
    await flushPromises()
    await input(wrapper, 'login__Rot-anna').vm.$emit('update:modelValue', 'anna01')

    const store = useDeploymentStore()
    store.draft.groupNames = ['Blau']
    await flushPromises()

    expect(Object.keys(inputs(wrapper))).toEqual(['login__Blau-anna'])
    expect(toastInfo).toHaveBeenCalledWith('deployment.variables.teamRenameToast')
  })

  it.each([
    ['Team-Variable', { name: 'quota', source: 'terraform', type: 'number', varScope: 'team' }],
    ['Personen-Variable', { name: 'login', source: 'terraform', type: 'string', varScope: 'user' }],
    ['Team-Datei', { name: 'cert', source: 'terraform', type: 'map(string)', osType: 'file', osScope: 'team' }],
  ])('weist bei einer %s ohne Teams genau einmal darauf hin', async (_label, variable) => {
    const wrapper = mountView({ groupNames: [], assignments: {} }, [variable])
    await flushPromises()

    expect(wrapper.text().split('deployment.variables.noTeamsConfigured').length - 1).toBe(1)
  })

  it('lässt Datei-Variablen aus den Werten heraus', async () => {
    const wrapper = mountView({}, [
      { name: 'cert', source: 'terraform', type: 'map(string)', osType: 'file', default: {} },
      { name: 'host', source: 'terraform', type: 'string', default: 'x' },
    ])
    await flushPromises()
    await next(wrapper)

    expect(useDeploymentStore().draft.variables).toEqual({ host: 'x' })
  })
})

