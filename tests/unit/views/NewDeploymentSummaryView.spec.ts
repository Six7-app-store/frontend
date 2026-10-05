import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useRouter } from 'vue-router'

// Dateinamen anpassen, falls nötig
import DeploymentSummary from '@/views/NewDeploymentSummaryView.vue' 

import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToastStore } from '@/stores/toast.store'
import { userApi } from '@/api/user.api'

// --- MOCKS ---
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn()
  }))
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      // Simples Mocking, das bei Platzhaltern etwas anhängt, um es testbar zu machen
      if (params && params.count !== undefined) return `${key} (${params.count})`
      return key
    }
  })
}))

vi.mock('@/api/user.api', () => ({
  userApi: {
    list: vi.fn()
  }
}))

// Mock für den OpenStack Cache
vi.mock('@/composables/useOpenStackResourceCache', () => ({
  ensureLoaded: vi.fn().mockResolvedValue(undefined),
  getDisplayName: vi.fn((_type, _mode, val) => ({ name: `OS-Name-${val}` }))
}))

describe('NewDeploymentSummaryView.vue', () => {
  let routerPushMock: any

  beforeEach(() => {
    vi.clearAllMocks()
    routerPushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: routerPushMock } as any)
    
    // Standard API Antworten
    vi.mocked(userApi.list).mockResolvedValue({ 
      data: [{ keycloak_id: 'kc1', userId: 'u1' }] 
    } as any)
  })

  function createWrapper() {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        app: {
          apps: [
            { appId: 'app-1', name: 'Test App', image: 'test.png' }
          ]
        },
        deployment: {
          studentCache: new Map([
            ['u1', { userId: 'u1', firstName: 'John', lastName: 'Doe', keycloak_id: null }]
          ]),
          draft: {
            name: 'My Deployment',
            appId: 'app-1',
            releaseTag: '1.0.0',
            groupCount: 1,
            groupMode: 'one',
            studentIds: ['u1'],
            assignments: {
              0: ['u1']
            },
            groupNames: ['Team Alpha'],
            variables: {
              'region': 'eu-central-1',
              'instance_type': 't2.micro',
              // Scoped through ``osScope`` only: one value per team.
              'net': { 'Team Alpha': 'net-1' }
            },
            fileUploads: {
              'ssh_key': {
                'u1': { name: 'id_rsa.pub', size: 1024 } // 1 KB
              }
            },
            variableDefinitions: []
          }
        }
      }
    })

    const appStore = useAppStore()
    appStore.fetchAppVariables = vi.fn().mockResolvedValue([
      { name: 'region', default: 'us-east' },
      { name: 'instance_type', default: 't2.small' },
      { name: 'ssh_key', osType: 'file', osScope: 'user' },
      { name: 'net', osType: 'network', osScope: 'team' }
    ])

    const deploymentStore = useDeploymentStore()
    deploymentStore.submitDraft = vi.fn().mockResolvedValue({ deploymentId: 'dep-123' })
    deploymentStore.resetDraft = vi.fn()

    return mount(DeploymentSummary, {
      global: {
        plugins: [pinia],
        stubs: {
          DeploymentProgressBar: true,
          BarChart3: true,
          ArrowRight: true,
          ArrowLeft: true,
          Box: true,
          Layers: true
        }
      }
    })
  }

  it('loads variables on mount and displays summary config', async () => {
    const wrapper = createWrapper()
    
    // Wir warten sofort auf alle API-Antworten. 
    // (Der Mock antwortet so schnell, dass der Loading-State übersprungen wird)
    await flushPromises() 
    
    const appStore = useAppStore()
    
    // Sollte Variablen geladen haben
    expect(appStore.fetchAppVariables).toHaveBeenCalledWith('app-1', '1.0.0')

    // Sollte die Zusammenfassung anzeigen
    expect(wrapper.text()).toContain('My Deployment')
    expect(wrapper.text()).toContain('Test App')
    expect(wrapper.text()).toContain('1.0.0')
    expect(wrapper.text()).toContain('John Doe') // Student Cache Name
    expect(wrapper.text()).toContain('Team Alpha')
  })

  it('lists variable values and files', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    // Die Werte, die aus den gemockten Variablen-Definitionen resultieren
    expect(wrapper.text()).toContain('eu-central-1') // Wert aus dem Draft
    expect(wrapper.text()).toContain('t2.micro') // Wert aus dem Draft
    expect(wrapper.text()).toContain('id_rsa.pub') // Datei-Upload
    expect(wrapper.text()).toContain('1 KB') // Formatierte Dateigröße
  })

  it('renders a variable scoped through osScope per slot', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Team Alpha: OS-Name-net-1')
    expect(wrapper.text()).not.toContain('[object Object]')
  })

  it('navigates back to variables step when Back or Edit button is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    // Zurück Button testen
    const backBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.back'))
    await backBtn?.trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployment.variables' })

    // "Bearbeiten" Button bei den Variablen testen
    const editBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.summary.editBtn'))
    await editBtn?.trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployment.variables' }) // Ruft die gleiche Route auf
  })

  it('reicht die userIds unveraendert an submitDraft weiter und leitet weiter', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const deploymentStore = useDeploymentStore()
    const toastStore = useToastStore()

    // Deploy Button klicken
    const deployBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.deploy'))
    await deployBtn?.trigger('click')

    // Warten auf API Calls
    await flushPromises()

    // Der Assistent fuehrt userIds, das Backend erwartet userIds - dazwischen
    // wird nichts mehr umgeschluesselt. Frueher stand hier eine Uebersetzung
    // von Keycloak-IDs, die jeden ohne Keycloak-Konto verlor.
    expect(deploymentStore.draft.studentIds).toContain('u1')
    expect((deploymentStore.draft.assignments as any)[0]).toContain('u1')
    
    // Wurde submit aufgerufen?
    expect(deploymentStore.submitDraft).toHaveBeenCalled()
    expect(deploymentStore.resetDraft).toHaveBeenCalled()
    
    // Erfolgs-Toast gesendet?
    expect(toastStore.success).toHaveBeenCalledWith('deployment.summary.submitSuccess', undefined)

    // Routing zur Liste
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployments.list' })
  })

  it('handles submission errors and parses them correctly for the toast', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const deploymentStore = useDeploymentStore()
    const toastStore = useToastStore()

    // Simuliere einen Fehler vom Backend ("file_too_large" Payload)
    deploymentStore.submitDraft = vi.fn().mockRejectedValue({
      response: {
        data: {
          detail: {
            reason: 'file_too_large',
            filename: 'test.zip',
            actual_bytes: 3145728, // 3 MB
            limit_bytes: 2097152 // 2 MB
          }
        }
      }
    })

    const deployBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.deploy'))
    await deployBtn?.trigger('click')
    await flushPromises()

    // Prüft ob der Error-Formatter korrekt gearbeitet hat
    expect(toastStore.error).toHaveBeenCalledWith('deployment.summary.errors.fileTooLarge', undefined) // Der i18n Key, den die Methode zurückgibt
    
    // Da es fehlgeschlagen ist, sollte nicht weitergeleitet werden
    expect(routerPushMock).not.toHaveBeenCalledWith({ name: 'deployments.list' })
  })
})

describe('NewDeploymentSummaryView.vue — Charakterisierung', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any)
  })

  const mountWith = (variableDefinitions: any[], variables: Record<string, unknown>) => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        app: { apps: [{ appId: 'app-1', name: 'Test App' }] },
        deployment: {
          studentCache: new Map(),
          draft: {
            name: 'D', appId: 'app-1', releaseTag: 'v1', groupCount: 1, groupMode: 'one',
            studentIds: [], assignments: {}, groupNames: [], fileUploads: {},
            variableDefinitions, variables,
          },
        },
      },
    })
    return mount(DeploymentSummary, {
      global: { plugins: [pinia], stubs: { DeploymentProgressBar: true } },
    })
  }

  /** label → value of every summary row. */
  const rows = (wrapper: ReturnType<typeof mountWith>) =>
    Object.fromEntries(
      wrapper.findAll('[data-testid="summary-var-row"]').map((row) => {
        const [label, value] = row.findAll('span')
        return [label!.text(), value!.text()]
      }),
    )

  it('formatiert Werte: Ja/Nein, Listen, Anführungszeichen, leer als Strich', async () => {
    const wrapper = mountWith([
      { name: 'on', type: 'bool' },
      { name: 'tags', type: 'list(string)' },
      { name: 'quoted', type: 'string' },
      { name: 'empty', type: 'string' },
    ], { on: true, tags: ['"a"', 'b'], quoted: '"x"', empty: '' })
    await flushPromises()

    expect(rows(wrapper)).toEqual({
      on: 'deployment.summary.yes',
      tags: 'a, b',
      quoted: 'x',
      empty: '-',
    })
  })

  it('zeigt OpenStack-Werte mit Namen und den übermittelten Wert als Tooltip', async () => {
    const wrapper = mountWith([
      { name: 'flavor', type: 'string', osType: 'flavor', osMode: 'id' },
      { name: 'nets', type: 'list(string)', osType: 'network', osMulti: true },
    ], { flavor: 'f-1', nets: 'n-1, n-2' })
    await flushPromises()

    expect(rows(wrapper)).toEqual({ flavor: 'OS-Name-f-1', nets: 'OS-Name-n-1, OS-Name-n-2' })
    const flavorValue = wrapper.findAll('[data-testid="summary-var-row"]')[0]!.findAll('span')[1]!
    expect(flavorValue.attributes('title')).toBe('deployment.summary.submittedValue')
  })

  describe('Fehler beim Absenden', () => {
    const submitFailing = async (error: unknown) => {
      const wrapper = mountWith([], {})
      await flushPromises()
      const store = useDeploymentStore()
      store.submitDraft = vi.fn().mockRejectedValue(error)
      await wrapper.findAll('button').find((b) => b.text().includes('deployment.actions.deploy'))!.trigger('click')
      await flushPromises()
      return useToastStore().error as any
    }
    const withDetail = (detail: unknown, message?: string) => ({ message, response: { data: { detail } } })

    it.each([
      [{ reason: 'file_too_large', filename: 'a.zip', actual_bytes: 1, limit_bytes: 2 }, 'deployment.summary.errors.fileTooLarge'],
      [{ reason: 'deployment_files_too_large', limit_bytes: 2 }, 'deployment.summary.errors.deploymentFilesTooLarge'],
      [{ reason: 'file_extension_rejected', variable: 'cert', slot: 'all', allowed: ['pem'] }, 'deployment.summary.errors.fileExtensionRejected'],
      [{ reason: 'file_b64_invalid', filename: 'a' }, 'deployment.summary.errors.fileB64Invalid'],
      [{ reason: 'file_size_mismatch', filename: 'a' }, 'deployment.summary.errors.fileSizeMismatch'],
    ])('übersetzt %j', async (detail, key) => {
      const toastError = await submitFailing(withDetail(detail))
      expect(toastError).toHaveBeenCalledWith(key, undefined)
    })

    it.each([
      ['einen String-detail', withDetail('Kontingent erschöpft', 'Request failed'), 'Kontingent erschöpft'],
      ['einen unbekannten Grund über die Fehlermeldung', withDetail({ reason: 'neu' }, 'Request failed'), 'Request failed'],
      ['sonst den Standardtext', withDetail(undefined), 'deployment.summary.submitError'],
    ])('meldet %s', async (_label, error, expected) => {
      const toastError = await submitFailing(error)
      expect(toastError).toHaveBeenCalledWith(expected, undefined)
    })
  })
})

