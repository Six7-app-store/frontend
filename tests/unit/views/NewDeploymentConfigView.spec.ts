import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useRouter } from 'vue-router'

// Anpassen an deinen tatsächlichen Dateinamen / Pfad
import DeploymentConfig from '@/views/NewDeploymentConfigView.vue' 

import { useDeploymentStore } from '@/stores/deployment.store'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { courseApi } from '@/api/course.api'
import { userApi } from '@/api/user.api'
import { useToast } from '@/composables/useToast'

// --- MOCKS ---
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn()
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
    success: vi.fn()
  }))
}))

vi.mock('@/api/course.api', () => ({
  courseApi: {
    list: vi.fn(),
    getById: vi.fn()
  }
}))

vi.mock('@/api/user.api', () => ({
  userApi: {
    list: vi.fn(),
    search: vi.fn()
  }
}))

describe('DeploymentConfig.vue', () => {
  let routerPushMock: any
  let toastWarningMock: any
  let toastErrorMock: any
  let toastClearMock: any
  let toastRemoveMock: any

  beforeEach(() => {
    vi.clearAllMocks()
    routerPushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: routerPushMock } as any)
    
    toastWarningMock = vi.fn()
    toastErrorMock = vi.fn(() => 'toast-search-error')
    toastClearMock = vi.fn()
    toastRemoveMock = vi.fn()
    vi.mocked(useToast).mockReturnValue({
      warning: toastWarningMock,
      error: toastErrorMock,
      clear: toastClearMock,
      remove: toastRemoveMock,
      success: vi.fn()
    } as any)

    // Standard API-Antworten mocken
    vi.mocked(courseApi.list).mockResolvedValue({ data: [{ courseId: 'c1', name: 'Web Dev' }] } as any)
    vi.mocked(userApi.list).mockResolvedValue({ data: [{ keycloak_id: 'u1', firstName: 'John', lastName: 'Doe' }] } as any)
    
    // --- HIER IST DER FIX GEGEN DIE ENDLOSSCHLEIFE ---
    vi.mocked(courseApi.getById).mockResolvedValue({ data: { users: [] } } as any)
  })

  function createWrapper(initialCredState = { isResolved: true, hasCredential: true }) {
    // 1. Pinia Instanz erstellen
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        deployment: {
          draft: {
            name: '',
            appId: 'app-1',
            studentIds: [],
            courseIds: []
          },
          studentCache: new Map()
        }
      }
    })

   // 2. Credential-Store explizit VOR dem Mounten konfigurieren
    const credStore = useOpenStackCredentialsStore(pinia)

    // Getters für den Test überschreiben
    Object.defineProperty(credStore, 'isResolved', { get: () => initialCredState.isResolved })
    Object.defineProperty(credStore, 'hasCredential', { get: () => initialCredState.hasCredential })

    // 'status' erwartet ein Objekt (CredentialStatus). 
    // Wir übergeben ein Mock-Objekt und nutzen 'as any', um fehlende Properties zu ignorieren.
    credStore.status = { 
      has_credential: initialCredState.hasCredential 
    } as any

    credStore.fetch = vi.fn().mockResolvedValue(undefined)
    // 3. Wrapper mounten
    return mount(DeploymentConfig, {
      global: {
        plugins: [pinia],
        stubs: {
          DeploymentProgressBar: true,
          CredentialMissingBanner: true,
          BarChart3: true,
          Search: true,
          Check: true,
          Users: true,
          BookOpen: true,
          UserPlus: true
        }
      }
    })
  }

  it('renders correctly and loads courses & students on mount', async () => {
    const wrapper = createWrapper()
    await flushPromises() // Warten auf onMounted API-Calls

    expect(courseApi.list).toHaveBeenCalledWith(0, 200)
    expect(userApi.list).toHaveBeenCalledWith({ role: 'student', limit: 1000 })
    
    // Der Kurs sollte nun angezeigt werden, da das v-if korrekt evaluiert wird
    expect(wrapper.text()).toContain('Web Dev')
  })

  it('loads the student counts once, outside the render, with limited parallelism', async () => {
    const courses = Array.from({ length: 12 }, (_, i) => ({ courseId: `c${i}`, name: `Kurs ${i}` }))
    vi.mocked(courseApi.list).mockResolvedValue({ data: courses } as any)

    let inFlight = 0
    let maxInFlight = 0
    const resolvers: Array<() => void> = []
    vi.mocked(courseApi.getById).mockImplementation((courseId: string) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      return new Promise((resolve) => {
        resolvers.push(() => {
          inFlight--
          resolve({ data: { users: [{ keycloak_id: `${courseId}-s1` }] } } as any)
        })
      })
    }) as any

    const wrapper = createWrapper()
    await flushPromises()

    expect(maxInFlight).toBeLessThanOrEqual(5)

    // Resolve everything that is queued, round by round.
    while (resolvers.length > 0) {
      resolvers.splice(0).forEach((resolve) => resolve())
      await flushPromises()
    }

    expect(courseApi.getById).toHaveBeenCalledTimes(12)
    expect(maxInFlight).toBeLessThanOrEqual(5)
    expect(wrapper.text()).toContain('DeploymentDetailView.deploymentStudentCount')

    // Re-rendering must not trigger further requests.
    await wrapper.vm.$forceUpdate()
    await flushPromises()
    expect(courseApi.getById).toHaveBeenCalledTimes(12)
  })

  it('shows missing credential banner and hides form if credentials are missing', async () => {
    const wrapper = createWrapper({ isResolved: true, hasCredential: false })
    await flushPromises()

    // Die Eingabefelder sollten durch das v-if nicht da sein
    expect(wrapper.find('[data-testid="deployment-name"]').exists()).toBe(false)
    
    // Der Next-Button sollte disabled sein
    const nextBtn = wrapper.find('[data-testid="btn-next"]')
    expect(nextBtn.attributes('disabled')).toBeDefined()
  })

  it('validates missing name when clicking next', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const store = useDeploymentStore()
    store.draft.name = '' 
    store.draft.studentIds = ['u1'] 

    await wrapper.find('[data-testid="btn-next"]').trigger('click')
    
    expect(toastWarningMock).toHaveBeenCalledWith('deployment.errors.missingName')
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('validates missing students when clicking next', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const store = useDeploymentStore()
    store.draft.name = 'My Deployment' 
    store.draft.studentIds = [] 

    await wrapper.find('[data-testid="btn-next"]').trigger('click')
    
    expect(toastWarningMock).toHaveBeenCalledWith('deployment.errors.missingStudents')
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('proceeds to next step when valid', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const store = useDeploymentStore()
    store.draft.name = 'My Deployment'
    store.draft.studentIds = ['u1'] 

    await wrapper.find('[data-testid="btn-next"]').trigger('click')
    
    expect(toastWarningMock).not.toHaveBeenCalled()
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployment.teams' })
  })

  it('switches tabs and selects an individual student', async () => {
    // 1. Fake-Timer aktivieren, um das 300ms Debouncing zu überspringen
    vi.useFakeTimers()

    const wrapper = createWrapper()
    await flushPromises()

    const store = useDeploymentStore()

    // 2. Tab wechseln
    const tabButtons = wrapper.findAll('button')
    const studentsTabBtn = tabButtons.find(btn => btn.text().includes('deployment.config.studentsLabel'))
    
    await studentsTabBtn?.trigger('click')
    await wrapper.vm.$nextTick()

    // 3. Mock für die Suche konfigurieren
    vi.mocked(userApi.search).mockResolvedValue({ 
      data: [{ keycloak_id: 'u1', firstName: 'John', lastName: 'Doe' }] 
    } as any)

    // 4. Suche auslösen (damit die Liste nicht leer ist)
    const searchInput = wrapper.find('[data-testid="student-search"]')
    await searchInput.setValue('John')

    // 5. Zeit um 300ms vorstellen (Debounce-Timer auslösen) und Promises abwarten
    vi.advanceTimersByTime(300)
    await flushPromises()
    await wrapper.vm.$nextTick()

    // 6. Jetzt ist der Student im DOM und wir können klicken
    const studentDiv = wrapper.find('[data-testid="student-u1"]')
    expect(studentDiv.exists()).toBe(true)
    await studentDiv.trigger('click')

    expect(store.draft.studentIds).toContain('u1')

    // 7. Timer wieder auf Normalbetrieb stellen (wichtig für andere Tests!)
    vi.useRealTimers()
  })

  it.each([
    ['Ladefehler', () => vi.mocked(courseApi.getById).mockRejectedValue(new Error('offline')), 'error', 'CourseDetailView.toasts.loadUsersError'],
    ['leerer Kurs', () => vi.mocked(courseApi.getById).mockResolvedValue({ data: { users: [] } } as any), 'warning', 'CourseDetailView.addModal.noUsersFound'],
  ])('meldet beim Kursklick %s passend', async (_label, arrange, type, key) => {
    arrange()
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="course-c1"]').trigger('click')
    await flushPromises()

    const expectedSpy = type === 'error' ? toastErrorMock : toastWarningMock
    const otherSpy = type === 'error' ? toastWarningMock : toastErrorMock
    expect(expectedSpy).toHaveBeenCalledWith(key)
    expect(otherSpy).not.toHaveBeenCalled()
  })

  it('meldet einen Suchfehler mit Objekt-detail als eigenen Text', async () => {
    vi.useFakeTimers()
    const wrapper = createWrapper()
    await flushPromises()

    const studentsTabBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.config.studentsLabel'))
    await studentsTabBtn?.trigger('click')
    await wrapper.vm.$nextTick()

    vi.mocked(userApi.search).mockRejectedValue({ response: { data: { detail: { reason: 'search_failed' } } } })
    await wrapper.find('[data-testid="student-search"]').setValue('Jo')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(toastErrorMock).toHaveBeenCalledWith('CourseDetailView.toasts.loadUsersError')
    vi.useRealTimers()
  })

  it('removes only its own search-error toast, never all toasts', async () => {
    vi.useFakeTimers()
    const wrapper = createWrapper()
    await flushPromises()

    const studentsTabBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.config.studentsLabel'))
    await studentsTabBtn?.trigger('click')
    await wrapper.vm.$nextTick()
    const searchInput = wrapper.find('[data-testid="student-search"]')

    // First search fails → error toast.
    vi.mocked(userApi.search).mockRejectedValueOnce(new Error('offline'))
    await searchInput.setValue('Jo')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)

    // Second search succeeds → only the previous search error is removed.
    vi.mocked(userApi.search).mockResolvedValue({ data: [] } as any)
    await searchInput.setValue('John')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(toastRemoveMock).toHaveBeenCalledWith('toast-search-error')
    expect(toastClearMock).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('handles back button correctly', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const store = useDeploymentStore()
    store.draft.appId = 'app-123'

    await wrapper.find('[data-testid="btn-back"]').trigger('click')
    
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'apps.detail', params: { id: 'app-123' } })
  })
})