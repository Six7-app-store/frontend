import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

import StepTarget from '@/components/deployment-wizard/StepTarget.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { draftBlockReason } from '@/services/wizard-steps.service'
import { courseApi } from '@/api/course.api'
import { userApi } from '@/api/user.api'
import { formatDate } from '@/utils/format'
import de from '@/i18n/locales/de'

vi.mock('@/api/course.api', () => ({ courseApi: { list: vi.fn(), getById: vi.fn() } }))
vi.mock('@/api/user.api', () => ({ userApi: { list: vi.fn(), search: vi.fn(), getById: vi.fn() } }))

enableAutoUnmount(afterEach)

const members = [
  { userId: 'u1', username: 'luca.baeck', firstName: 'Luca', lastName: 'Bäck' },
  { userId: 'u2', username: 'mika.jun', firstName: 'Mika', lastName: 'Jun' },
  { userId: 'u3', username: 'tom.weber', firstName: 'Tom', lastName: 'Weber' },
]

async function mountStep() {
  const wrapper = mount(StepTarget, {
    global: {
      plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })],
      stubs: { ConfirmModal: true },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

const today = () => formatDate(new Date())

describe('StepTarget', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
    useDeploymentStore().startDraft({ appId: 'ide', appName: 'Online-IDE', releaseTag: 'v1.2.0' })
    vi.mocked(courseApi.list).mockResolvedValue({ data: [{ courseId: 'c1', name: 'WI SE B 23' }, { courseId: 'c2', name: 'Leer' }] } as never)
    vi.mocked(courseApi.getById).mockImplementation(async (id: string) =>
      ({ data: { users: id === 'c1' ? members : [] } }) as never)
    vi.mocked(userApi.search).mockResolvedValue({ data: members } as never)
  })

  it('zeigt die gewählte App mit Version und „Ändern“', async () => {
    const wrapper = await mountStep()
    expect(wrapper.get('[data-testid="chosen-app"]').text()).toContain('Online-IDE')
    expect(wrapper.get('[data-testid="chosen-app"]').text()).toContain('v1.2.0')

    await wrapper.get('[data-testid="btn-change-app"]').trigger('click')
    expect(wrapper.emitted('change-app')).toHaveLength(1)
  })

  it('listet Kurse mit Mitgliederzahl und übernimmt beim Wählen alle Mitglieder', async () => {
    const wrapper = await mountStep()
    const select = wrapper.get('[data-testid="course-select"]')
    expect(select.text()).toContain('WI SE B 23 · 3 Mitglieder')

    await select.setValue('c1')
    await flushPromises()
    const draft = useDeploymentStore().draft
    expect(draft.studentIds).toEqual(['u1', 'u2', 'u3'])
    expect(draft.courseIds).toEqual(['c1'])
  })

  it('meldet einen Kurs ohne Mitglieder als Fehler mit Text', async () => {
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="course-select"]').setValue('c2')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Dieser Kurs hat noch keine Mitglieder.')
    expect(useDeploymentStore().draft.studentIds).toEqual([])
  })

  it('schlägt den Namen „<App> – <Kurs> – <Datum>“ vor, bis man ihn selbst ändert', async () => {
    const wrapper = await mountStep()
    const name = wrapper.get<HTMLInputElement>('[data-testid="deployment-name"]')
    expect(name.element.value).toBe(`Online-IDE – ${today()}`)

    await wrapper.get('[data-testid="course-select"]').setValue('c1')
    await flushPromises()
    expect(name.element.value).toBe(`Online-IDE – WI SE B 23 – ${today()}`)
    expect(wrapper.get(`label[for="${name.attributes('id')}"]`).text()).toBe('Name des Deployments')

    await name.setValue('Mein Lab')
    await wrapper.get('[data-testid="btn-pick-individually"]').trigger('click')
    await wrapper.get('[data-testid="remove-u1"]').trigger('click')
    expect(useDeploymentStore().draft.name).toBe('Mein Lab')
  })

  it('wählt einzelne Studierende über die Suche', async () => {
    vi.useFakeTimers()
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="btn-pick-individually"]').trigger('click')
    expect(wrapper.find('[data-testid="course-select"]').exists()).toBe(false)

    await wrapper.get('[data-testid="student-search"]').setValue('mi')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    await wrapper.get('[data-testid="student-u2"]').trigger('click')
    vi.useRealTimers()

    expect(useDeploymentStore().draft.studentIds).toEqual(['u2'])
    expect(wrapper.get('[data-testid="picked-count"]').text()).toBe('1 Person')
    expect(useDeploymentStore().draft.name).toBe(`Online-IDE – 1 Person – ${today()}`)
  })

  it('bietet drei Aufteilungen mit Ergebnis an und empfiehlt „Alle zusammen“', async () => {
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="course-select"]').setValue('c1')
    await flushPromises()

    const cards = wrapper.findAll('[role="radio"]')
    expect(cards.map((c) => c.attributes('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(cards[0]!.get('[data-testid="radio-card-badge"]').text()).toBe('Empfohlen für diese App')
    expect(cards.map((c) => c.get('[data-testid="radio-card-result"]').text())).toEqual([
      '1 Umgebung für 3 Personen', '3 Umgebungen', 'Anzahl hängt von deinen Gruppen ab',
    ])
    const group = wrapper.get('[role="radiogroup"]')
    expect(wrapper.get(`#${group.attributes('aria-labelledby')}`).text()).toBe('Wie sollen die Teilnehmenden arbeiten?')
  })

  it('lässt „Alle zusammen“ ohne Zuordnungsschritt weiter — keine Sackgasse mehr', async () => {
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="course-select"]').setValue('c1')
    await flushPromises()

    const draft = useDeploymentStore().draft
    expect(draft.groupMode).toBe('one')
    expect(draftBlockReason('target', draft)).toBeNull()
    expect(wrapper.find('[data-testid="team-builder"]').exists()).toBe(false)
  })

  it('zeigt Drag & Drop nur bei „Gruppen selbst bilden“ und verteilt dort vorab auf zwei Gruppen', async () => {
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="course-select"]').setValue('c1')
    await flushPromises()

    await wrapper.get('[data-testid="radio-card-custom"]').trigger('click')
    const builder = wrapper.get('[data-testid="team-builder"]')
    expect(builder.get('[data-testid="team-count"]').text()).toBe('2')
    expect(builder.get('[data-testid="pool-count"]').text()).toBe('0')
    expect(wrapper.get('[data-testid="radio-card-custom"] [data-testid="radio-card-result"]').text()).toBe('2 Umgebungen')
    expect(draftBlockReason('target', useDeploymentStore().draft)).toBeNull()

    await wrapper.get('[data-testid="radio-card-eachUser"]').trigger('click')
    expect(wrapper.find('[data-testid="team-builder"]').exists()).toBe(false)
  })
})
