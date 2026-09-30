import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'

import DeploymentsListView from '@/views/DeploymentsListView.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

// ---------------------------------------------------------
// 1. Mocks & Setup
// ---------------------------------------------------------

let mockDeployments: any[] = []
let mockDeploymentsLoading = false
let mockApps: any[] = []

const mockFetchDeployments = vi.fn()
const mockFetchApps = vi.fn()

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => ({
    get deployments() { return mockDeployments },
    get isLoading() { return mockDeploymentsLoading },
    fetchDeployments: mockFetchDeployments
  })
}))

vi.mock('@/stores/app.store', () => ({
  useAppStore: () => ({
    get apps() { return mockApps },
    fetchApps: mockFetchApps
  })
}))

// Die View liest die Rolle, um Studierenden den Anlegen-Knopf und das
// Deployment-Vokabular vorzuenthalten. Ohne Mock zieht ``useRole`` den
// echten Auth-Store und damit Pinia herein. Diese Datei prueft die
// Dozentenansicht — Release-Tag, Datum, Anlegen-Knopf.
// Die Studentenansicht hat ihre eigene Spec: DeploymentsListView.roles.
vi.mock('@/composables/useRole', async () => {
  const { computed } = await import('vue')
  return {
    useRole: () => ({
      isStaff: computed(() => true),
      isStudent: computed(() => false),
    }),
  }
})

const makeDeployment = (overrides: Record<string, any> = {}) => ({
  deploymentId: 'dep-1',
  appId: 'app-123',
  status: 'success',
  name: 'Dep 1',
  releaseTag: 'v1',
  created_at: '2026-06-08T15:30:00Z',
  ...overrides
})

// ---------------------------------------------------------
// 2. Die Tests
// ---------------------------------------------------------

describe('DeploymentsListView.vue', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    mockDeployments = []
    mockDeploymentsLoading = false
    mockApps = []
  })

  const mountComponent = () => {
    return mount(DeploymentsListView, {
      global: {
        mocks: {
          $t: (key: string, vars?: any) => vars ? `${key} ${JSON.stringify(vars)}` : key
        },
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    })
  }

  // --- 1. Lifecycle & API Calls ---

  it('lädt alle notwendigen Daten beim Starten der View', async () => {
    mountComponent()
    await flushPromises()

    expect(mockFetchDeployments).toHaveBeenCalledTimes(1)
    expect(mockFetchApps).toHaveBeenCalledTimes(1)
  })

  // --- 2. Karteninhalt ---

  it('zeigt Name, App-Name, Release-Tag und Datum je Deployment', () => {
    mockDeployments = [makeDeployment()]
    mockApps = [{ appId: 'app-123', name: 'Mein Backend' }]

    const text = mountComponent().text()

    expect(text).toContain('Dep 1')
    expect(text).toContain('Mein Backend')
    expect(text).toContain('v1')
    expect(text).toContain('08.06.2026')
  })

  it('zeigt "-", wenn die App zur appId nicht geladen ist', () => {
    mockDeployments = [makeDeployment({ appId: 'unbekannt' })]
    mockApps = []

    expect(mountComponent().text()).toContain('-')
  })

  it('verlinkt jede Zeile auf die Detailseite', () => {
    mockDeployments = [makeDeployment({ deploymentId: 'dep-42' })]

    const links = mountComponent().findAllComponents(RouterLinkStub)

    expect(links.some((link) => {
      const to = link.props('to') as any
      return to?.name === 'deployments.detail' && to?.params?.id === 'dep-42'
    })).toBe(true)
  })

  it('sortiert die Deployments mit dem neuesten zuerst', () => {
    mockDeployments = [
      makeDeployment({ deploymentId: 'alt', name: 'Alt', created_at: '2026-06-01T10:00:00Z' }),
      makeDeployment({ deploymentId: 'neu', name: 'Neu', created_at: '2026-06-09T10:00:00Z' }),
      makeDeployment({ deploymentId: 'ohne-datum', name: 'Ohne Datum', created_at: undefined })
    ]

    const names = mountComponent().findAll('[data-testid="deployment-name"]').map((n) => n.text())

    expect(names).toEqual(['Neu', 'Alt', 'Ohne Datum'])
  })

  it.each([
    ['failed', 'DeploymentsView.deploymentFailed', 'status-dot-danger'],
    ['paused', 'DeploymentsView.deploymentPaused', 'status-dot-neutral'],
    ['unbekannt', 'DeploymentsView.noStatus', 'status-dot-neutral']
  ])('zeigt den Status %s übersetzt und passend eingefärbt', (status, label, dotClass) => {
    mockDeployments = [makeDeployment({ status })]

    const dot = mountComponent().get('.status-dot')

    expect(dot.element.parentElement?.textContent?.trim()).toBe(label)
    expect(dot.classes()).toContain(dotClass)
  })

  // --- 3. UI-Zustände ---

  it('zeigt den Loader, solange noch keine Deployments da sind', () => {
    mockDeploymentsLoading = true

    expect(mountComponent().find('.animate-spin').exists()).toBe(true)
  })

  it('zeigt die "Keine Deployments"-Meldung, wenn die Liste leer ist', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('DeploymentsView.deploymentsMissingMessage')
    expect(wrapper.find('.animate-spin').exists()).toBe(false)
  })
})
