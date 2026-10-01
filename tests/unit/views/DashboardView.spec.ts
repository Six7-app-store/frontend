import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import { h } from 'vue'

import DashboardView from '@/views/DashboardView.vue'
import MeterBar from '@/components/ui/MeterBar.vue'

// ---------------------------------------------------------
// 1. Mocks & Setup
// ---------------------------------------------------------

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: any) => vars ? `${key} ${JSON.stringify(vars)}` : key
  })
}))

let mockUser: any = { username: 'john' }
let mockCredStatus: any = null
let mockCredResolved = true
let mockHasCredential = true
let mockCredLastError: string | null = null

let mockQuotasLoading = false
let mockHasCachedQuotas = true
let mockNeedsCredentials = false
let mockQuotas: any[] = []

let mockCanAccessCourses = true

const mockFetchStats = vi.fn()
const mockFetchQuotas = vi.fn()
const mockFetchCredentials = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    get user() { return mockUser }
  })
}))

vi.mock('@/stores/openstack-credentials.store', () => ({
  useOpenStackCredentialsStore: () => ({
    get status() { return mockCredStatus },
    get isResolved() { return mockCredResolved },
    get hasCredential() { return mockHasCredential },
    get lastError() { return mockCredLastError },
    fetch: mockFetchCredentials
  })
}))

vi.mock('@/composables/useDashboard', () => ({
  useDashboard: () => ({
    stats: { value: { deployments: 3, apps: 5, courses: 2 } },
    fetchStats: mockFetchStats
  })
}))

vi.mock('@/composables/useQuotas', () => ({
  useQuotas: () => ({
    get formattedQuotas() { return mockQuotas },
    get loading() { return mockQuotasLoading },
    get needsCredentials() { return mockNeedsCredentials },
    get hasCachedQuotas() { return mockHasCachedQuotas },
    fetchQuotas: mockFetchQuotas,
  })
}))

vi.mock('@/composables/useRouteAccess', () => ({
  useRouteAccess: () => ({ canAccess: () => mockCanAccessCourses })
}))

const quota = (overrides: Record<string, any> = {}) => ({
  icon: () => h('span'),
  label: 'vCPUs',
  used: 4,
  limit: 8,
  percentage: 50,
  unit: '',
  ...overrides
})

// ---------------------------------------------------------
// 2. Die Tests
// ---------------------------------------------------------

describe('DashboardView.vue', () => {

  beforeEach(() => {
    vi.clearAllMocks()

    mockUser = { username: 'john' }
    mockCredStatus = { has_credential: true }
    mockCredResolved = true
    mockHasCredential = true
    mockCredLastError = null

    mockQuotasLoading = false
    mockHasCachedQuotas = true
    mockNeedsCredentials = false
    mockQuotas = [quota()]

    mockCanAccessCourses = true

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 7, 14, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mountComponent = () => {
    return mount(DashboardView, {
      global: {
        mocks: {
          $t: (key: string, vars?: any) => vars ? `${key} ${JSON.stringify(vars)}` : key
        },
        stubs: {
          RouterLink: RouterLinkStub,
          CredentialMissingBanner: {
            props: ['variant', 'title', 'message'],
            template: '<div class="stub-banner" :data-variant="variant">{{ message }}</div>'
          }
        }
      }
    })
  }

  // --- 1. Lifecycle & API Calls ---

  it('lädt alle notwendigen Daten beim Starten der View', async () => {
    mockCredStatus = null

    mountComponent()
    await flushPromises()

    expect(mockFetchStats).toHaveBeenCalledTimes(1)
    expect(mockFetchQuotas).toHaveBeenCalledTimes(1)
    expect(mockFetchCredentials).toHaveBeenCalledTimes(1)
  })

  it('lädt Credentials nicht erneut, wenn sie bereits vorhanden sind', async () => {
    mountComponent()
    await flushPromises()

    expect(mockFetchCredentials).not.toHaveBeenCalled()
  })

  // --- 2. Begrüßung & Name ---

  it('begrüßt mit dem Usernamen mit großem Anfangsbuchstaben', () => {
    mockUser = { username: 'maximilian' }

    expect(mountComponent().find('h1').text()).toBe('DashboardView.timeGreetings.afternoon, Maximilian')
  })

  it('begrüßt ohne Namen, wenn kein User geladen ist', () => {
    mockUser = null

    expect(mountComponent().find('h1').text()).toBe('DashboardView.timeGreetings.afternoon')
  })

  // --- Hauptaktion ---

  it('verlinkt "Neues Deployment" auf die Apps, wenn Credentials hinterlegt sind', () => {
    const wrapper = mountComponent()

    const link = wrapper.findAllComponents(RouterLinkStub).find((l) => l.text().includes('DashboardView.deploymentNew'))
    expect((link?.props('to') as any)?.name).toBe('apps')
    expect(wrapper.find('button[disabled]').exists()).toBe(false)
  })

  it('sperrt "Neues Deployment" ohne Credentials und nennt den Grund', () => {
    mockHasCredential = false

    const button = mountComponent().find('button[disabled]')

    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('DashboardView.deploymentNew')
    expect(button.attributes('title')).toBe('DashboardView.deploymentNeedsCredentials')
  })

  it.each([
    [9, 'DashboardView.timeGreetings.morning'],
    [14, 'DashboardView.timeGreetings.afternoon'],
    [20, 'DashboardView.timeGreetings.evening']
  ])('begrüßt um %s Uhr passend', (hour, expected) => {
    vi.setSystemTime(new Date(2026, 5, 7, hour as number, 0, 0))

    expect(mountComponent().text()).toContain(expected)
  })

  // --- 3. KPI-Kacheln ---

  it('zeigt die Kennzahlen und verlinkt sie', () => {
    const wrapper = mountComponent()

    const text = wrapper.text()
    expect(text).toContain('3')
    expect(text).toContain('5')
    expect(text).toContain('2')

    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => (link.props('to') as any)?.name)
    expect(targets).toContain('deployments.list')
    expect(targets).toContain('apps')
    expect(targets).toContain('courses')
  })

  it('blendet die Kurs-Kachel aus, wenn die Rolle keinen Zugriff hat', () => {
    mockCanAccessCourses = false

    const targets = mountComponent().findAllComponents(RouterLinkStub).map((link) => (link.props('to') as any)?.name)

    expect(targets).not.toContain('courses')
  })

  // --- 4. Banner ---

  it('zeigt den Banner für fehlende Credentials', () => {
    mockHasCredential = false

    const banner = mountComponent().find('.stub-banner')

    expect(banner.exists()).toBe(true)
    expect(banner.attributes('data-variant')).toBe('warning')
  })

  it('zeigt den Banner für ungültige Credentials mit dem Fehlertext des Stores', () => {
    mockCredLastError = 'Auth failed'

    const banner = mountComponent().find('.stub-banner')

    expect(banner.attributes('data-variant')).toBe('error')
    expect(banner.text()).toContain('Auth failed')
  })

  it('zeigt keinen Banner, solange der Credential-Status noch nicht aufgelöst ist', () => {
    mockCredResolved = false
    mockHasCredential = false

    expect(mountComponent().find('.stub-banner').exists()).toBe(false)
  })

  // --- 5. Quota-Bereich ---

  it('zeigt die Quotas mit Auslastung', () => {
    mockQuotas = [quota({ label: 'RAM', used: 6, limit: 8, percentage: 75, unit: 'GB' })]

    const text = mountComponent().text()

    expect(text).toContain('RAM')
    expect(text).toContain('6 / 8 GB')
    expect(text).toContain('75 %')
  })

  it.each([
    [30, 'meter-fill-low'],
    [50, 'meter-fill-mid'],
    [95, 'meter-fill-mid'],
  ])('zeigt %s%% Auslastung als Balken, grün unter und gelb ab 50 %%, nie rot', (percentage, fillClass) => {
    mockQuotas = [quota({ percentage })]

    const wrapper = mountComponent()

    const meter = wrapper.findComponent(MeterBar)
    expect(meter.props('value')).toBe(percentage)
    expect(meter.find(`.${fillClass}`).exists()).toBe(true)
    expect(wrapper.find('.text-danger').exists()).toBe(false)
  })

  it('zeigt das Skeleton beim ersten Laden', () => {
    mockQuotasLoading = true
    mockHasCachedQuotas = false

    expect(mountComponent().findAll('.animate-pulse').length).toBe(6)
  })

  it('zeigt den Hinweis auf fehlende Credentials statt der Quotas', () => {
    mockQuotas = []
    mockNeedsCredentials = true

    const text = mountComponent().text()

    expect(text).toContain('DashboardView.resourcesNeedCredentials')
    expect(mountComponent().findComponent(MeterBar).exists()).toBe(false)
  })

  it('zeigt den Fehlertext, wenn keine Quotas geladen werden konnten', () => {
    mockQuotas = []
    mockNeedsCredentials = false

    expect(mountComponent().text()).toContain('DashboardView.quotaLoadError')
  })
})
