import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useRouter } from 'vue-router'

// Anpassen an deinen tatsächlichen Dateinamen / Pfad
import DeploymentTeams from '@/views/NewDeploymentGroupsAssignmentView.vue' 

import { useDeploymentStore } from '@/stores/deployment.store'
import { userApi } from '@/api/user.api'

// --- MOCKS ---
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn()
  }))
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (params?.index !== undefined) return `Team ${params.index}`
      return key
    }
  })
}))

vi.mock('@/api/user.api', () => ({
  userApi: {
    getById: vi.fn()
  }
}))

describe('NewDeploymentTeamsView.vue', () => {
  let routerPushMock: any
  let routerReplaceMock: any

  beforeEach(() => {
    vi.clearAllMocks()
    routerPushMock = vi.fn()
    routerReplaceMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ 
      push: routerPushMock, 
      replace: routerReplaceMock 
    } as any)
    
    // Standard-Mock für fehlende Studenten im Cache
    vi.mocked(userApi.getById).mockResolvedValue({ 
      data: { userId: 'u3', firstName: 'Missing', lastName: 'User' } 
    } as any)
  })

  function createWrapper(customDraftState = {}, extraCacheEntries: Array<[string, any]> = []) {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        deployment: {
          studentCache: new Map([
            ['u1', { userId: 'u1', firstName: 'John', lastName: 'Doe' }],
            ['u2', { userId: 'u2', firstName: 'Jane', lastName: 'Smith' }],
            ...extraCacheEntries
          ]),
          draft: {
            studentIds: ['u1', 'u2'],
            groupCount: 2,
            groupNames: ['Team 1', 'Team 2'],
            assignments: [[], []],
            groupMode: 'custom',
            ...customDraftState
          }
        }
      }
    })

    return mount(DeploymentTeams, {
      global: {
        plugins: [pinia],
        stubs: {
          DeploymentProgressBar: true,
          Plus: true,
          Minus: true,
          Users: true,
          ArrowLeft: true,
          ArrowRight: true,
          GripVertical: true,
          Trash2: true,
          UserPlus: true,
          Shuffle: true,
          X: true
        }
      }
    })
  }

  it('redirects to config if no students are selected', async () => {
    createWrapper({ studentIds: [] }) // Keine Studenten
    await flushPromises()

    expect(routerReplaceMock).toHaveBeenCalledWith({ name: 'deployment.config' })
  })

  it('lädt einen Studenten nach, der noch gar nicht im Cache steht', async () => {
    vi.mocked(userApi.getById).mockResolvedValue({
      data: { userId: 'u-db-3', keycloak_id: 'kc-3', firstName: 'Kira', lastName: 'Kirsch' }
    } as any)
    const wrapper = createWrapper({ studentIds: ['u1', 'u-db-3'] })
    await flushPromises()

    expect(userApi.getById).toHaveBeenCalledWith('u-db-3')
    expect(wrapper.text()).toContain('Kira Kirsch')
    expect(wrapper.text()).not.toContain('u-db-3')
  })

  it('findet einen Studenten wieder, der unter einem anderen Schlüssel im Cache liegt', async () => {
    const wrapper = createWrapper(
      { studentIds: ['u1', 'u-db-9'] },
      [['irgendein-anderer-key', { userId: 'u-db-9', firstName: 'Cached', lastName: 'Person' }]]
    )
    await flushPromises()

    expect(userApi.getById).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Cached Person')
  })

  it('zeigt auch Studierende ohne Keycloak-Konto', async () => {
    // Der Fall, für den die Umstellung auf ``userId`` gemacht ist: wer über
    // einen Moodle-Launch entstanden ist, hat kein ``keycloak_id``. Vorher
    // fiel so jemand aus dem Assistenten heraus, ohne dass es auffiel.
    const wrapper = createWrapper(
      { studentIds: ['u-lti-1'] },
      [['u-lti-1', { userId: 'u-lti-1', keycloak_id: null, firstName: 'Lea', lastName: 'Moodle' }]]
    )
    await flushPromises()

    expect(userApi.getById).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Lea Moodle')
  })

  it('renders correctly with unassigned students', async () => {
    const wrapper = createWrapper()
    await flushPromises()

   
    
    // Beide Studenten sollten im Unassigned-Pool sein, da 'assignments' leer ist
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('Jane Smith')
    
    // Next-Button sollte deaktiviert sein (weil nicht alle zugewiesen sind)
    const nextBtn = wrapper.find('button.bg-gradient-to-r')
    expect(nextBtn.attributes('disabled')).toBeDefined()
  })

  it('assigns all students to one group when "One Group" mode is selected', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    const store = useDeploymentStore()

    // Klick auf den "One Group" Button
    const buttons = wrapper.findAll('button')
    const oneGroupBtn = buttons.find(b => b.text() === 'deployment.groups.one')
    await oneGroupBtn?.trigger('click')

    // Prüfen, ob Store aktualisiert wurde
    expect(store.draft.groupMode).toBe('one')
    expect(store.draft.groupCount).toBe(1)
    expect(store.draft.assignments[0]).toEqual(['u1', 'u2']) // Beide im ersten Array
  })

  it.each([
    ['einen eigenen Namen behält', 'Team Rot', 'Team Rot'],
    ['einen Standardnamen ersetzt', 'Team 2', 'Team 1'],
    ['einen leeren Namen ersetzt', '   ', 'Team 1'],
  ])('"One Group" %s', async (_label, given, expected) => {
    const wrapper = createWrapper({ groupNames: [given, 'Team 2'] })
    await flushPromises()
    const store = useDeploymentStore()

    const oneGroupBtn = wrapper.findAll('button').find(b => b.text() === 'deployment.groups.one')
    await oneGroupBtn?.trigger('click')

    expect(store.draft.groupNames).toEqual([expected])
  })

  it('assigns one student per group when "Each User" mode is selected', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    const store = useDeploymentStore()

    // Klick auf "Each User"
    const buttons = wrapper.findAll('button')
    const eachUserBtn = buttons.find(b => b.text() === 'deployment.groups.eachUser')
    await eachUserBtn?.trigger('click')

    // Jeder in einer eigenen Gruppe
    expect(store.draft.groupMode).toBe('eachUser')
    expect(store.draft.groupCount).toBe(2)
    expect(store.draft.assignments[0]).toContain('u1')
    expect(store.draft.assignments[1]).toContain('u2')
  })

  it('increments and decrements group count correctly', async () => {
    // 3 Studenten für dieses Setup
    const wrapper = createWrapper({ studentIds: ['u1', 'u2', 'u3'] })
    await flushPromises()
    const store = useDeploymentStore()

    // Klick auf "+"
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.html().includes('lucide-plus'))
    
    await plusBtn?.trigger('click')
    expect(store.draft.groupCount).toBe(3)

    // Klick auf "-"
    const minusBtn = buttons.find(b => b.html().includes('lucide-minus'))
    await minusBtn?.trigger('click')
    expect(store.draft.groupCount).toBe(2)
  })

  it('moves the students of a removed group back to the unassigned pool', async () => {
    const wrapper = createWrapper({
      studentIds: ['u1', 'u2', 'u3'],
      assignments: [['u1'], ['u2'], ['u3']],
      groupCount: 3
    })
    await flushPromises()
    const store = useDeploymentStore()

    const minusBtn = wrapper.findAll('button').find(b => b.html().includes('lucide-minus'))
    await minusBtn?.trigger('click')

    expect(store.draft.groupCount).toBe(2)
    expect(store.draft.assignments).toEqual([['u1'], ['u2']])
    expect(wrapper.text()).not.toContain('deployment.assignment.allAssigned')
  })

  it('removes a student from a group when clicking the X button', async () => {
    // Vorab zugewiesener Zustand
    const wrapper = createWrapper({
      assignments: [['u1', 'u2'], []],
      groupCount: 2
    })
    await flushPromises()
    const store = useDeploymentStore()

    // Finde den Remove-Button (das erste 'X' in der Drop-Zone)
    const removeBtn = wrapper.find('button[title="CourseDetailView.removeModal.remove"]')
    expect(removeBtn.exists()).toBe(true)
    
    await removeBtn.trigger('click')
    
    // 'u1' sollte nun nicht mehr in der Gruppe sein
    expect(store.draft.assignments[0]).not.toContain('u1')
  })

  it('enables the next button only if all students are assigned and groups are valid', async () => {
    // Zunächst unzugewiesen
    const wrapper = createWrapper({
      assignments: [[], []],
      groupCount: 2
    })
    await flushPromises()

    const nextBtn = wrapper.find('button.bg-gradient-to-r')
    expect(nextBtn.attributes('disabled')).toBeDefined()

    // Weise sie manuell im Store zu
    const store = useDeploymentStore()
    store.draft.assignments = [['u1'], ['u2']]
    
    // Erzwinge Vue-Update
    await wrapper.vm.$nextTick()

    // Button sollte jetzt aktiv sein
    expect(nextBtn.attributes('disabled')).toBeUndefined()

    // Klick test
    await nextBtn.trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployment.variables' })
  })

  it('navigates back on back button click', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const backBtn = wrapper.find('button.bg-gray-100')
    await backBtn.trigger('click')

    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deployment.config' })
  })

  // `dragenter`/`dragleave` bubble, so the student cards inside a drop zone
  // fire them too. Clearing the highlight on those used to make the zone
  // resize under a stationary cursor, which fired the pair again and hung the
  // drag. The zone must only give up its highlight once the pointer is
  // really outside it.
  describe('Drag-Hervorhebung', () => {
    it('behaelt die Hervorhebung, wenn der Zeiger auf ein Kind der Zone wandert', async () => {
      const wrapper = createWrapper({ assignments: [['u1'], ['u2']] })
      await flushPromises()

      const zone = wrapper.find('[data-testid="group-dropzone-0"]')
      await zone.trigger('dragenter')
      expect(zone.classes()).toContain('bg-emerald-50')

      // Ein Studentenkaertchen innerhalb der Zone.
      const child = zone.element.querySelector('div')
      expect(child).not.toBeNull()

      await zone.trigger('dragleave', { relatedTarget: child })
      expect(zone.classes()).toContain('bg-emerald-50')
    })

    it('gibt die Hervorhebung frei, wenn der Zeiger die Zone wirklich verlaesst', async () => {
      const wrapper = createWrapper({ assignments: [['u1'], ['u2']] })
      await flushPromises()

      const zone = wrapper.find('[data-testid="group-dropzone-0"]')
      await zone.trigger('dragenter')
      expect(zone.classes()).toContain('bg-emerald-50')

      await zone.trigger('dragleave', { relatedTarget: document.body })
      expect(zone.classes()).toContain('bg-gray-50')
    })

    it('haelt auch die Unassigned-Spalte ueber ihren Kindern hervorgehoben', async () => {
      const wrapper = createWrapper({ assignments: [[], []] })
      await flushPromises()

      const zone = wrapper.find('[data-testid="unassigned-dropzone"]')
      await zone.trigger('dragenter')
      expect(zone.classes()).toContain('bg-gray-200')

      const child = zone.element.querySelector('div')
      expect(child).not.toBeNull()

      await zone.trigger('dragleave', { relatedTarget: child })
      expect(zone.classes()).toContain('bg-gray-200')

      await zone.trigger('dragleave', { relatedTarget: document.body })
      expect(zone.classes()).not.toContain('bg-gray-200')
    })

    // Die Karte darf sich beim Ueberfahren nicht vergroessern -- genau das
    // zog den Rand unter dem Zeiger weg und startete die Schleife neu.
    it('vergroessert die Team-Karte beim Ueberfahren nicht', async () => {
      const wrapper = createWrapper({ assignments: [['u1'], ['u2']] })
      await flushPromises()

      const zone = wrapper.find('[data-testid="group-dropzone-0"]')
      await zone.trigger('dragenter')

      const card = wrapper.findAll('.rounded-xl').find(el => el.element.contains(zone.element))
      expect(card).toBeDefined()
      expect(card!.classes().join(' ')).not.toContain('scale-')
    })
  })
})