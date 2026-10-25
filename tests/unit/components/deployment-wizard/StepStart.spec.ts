/**
 * The start step with the real variable form: required inputs, files matched
 * by name, "Erweitert", the summary, and the reasons it reports up.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

import StepStart from '@/components/deployment-wizard/StepStart.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { appApi } from '@/api/app.api'
import { userApi } from '@/api/user.api'
import { quotasApi } from '@/api/quotas.api'
import de from '@/i18n/locales/de'
import type { AppVariable } from '@/types'

vi.mock('@/api/app.api', () => ({ appApi: { getVariables: vi.fn(), list: vi.fn(), getById: vi.fn() } }))
vi.mock('@/api/user.api', () => ({ userApi: { getById: vi.fn() } }))
vi.mock('@/api/quotas.api', () => ({ quotasApi: { getOverview: vi.fn() } }))
vi.mock('@/composables/useOpenStackResourceCache', () => ({ ensureLoaded: vi.fn(async () => {}), getDisplayName: vi.fn(() => null) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() }) }))

enableAutoUnmount(afterEach)

const people: Record<string, object> = {
  u1: { userId: 'u1', username: 'luca.baeck', firstName: 'Luca', lastName: 'Bäck' },
  u2: { userId: 'u2', username: 'mika.jun', firstName: 'Mika', lastName: 'Jun' },
}

const taskFile: AppVariable = { name: 'task_files', type: 'map(string)', osType: 'file', osScope: 'user', required: true, description: 'Aufgabe je Person. Liegt im Home.' } as AppVariable
const login: AppVariable = { name: 'course_code', type: 'string', required: true, description: 'Kürzel des Kurses.' } as AppVariable
const flavor: AppVariable = { name: 'flavor_name', type: 'string', osType: 'flavor', default: 'm1.small' } as AppVariable
const network: AppVariable = { name: 'network_uuid', type: 'string', osType: 'network', default: 'net-1' } as AppVariable

async function mountStep(definitions: AppVariable[], { fail = false } = {}) {
  if (fail) vi.mocked(appApi.getVariables).mockRejectedValue(new Error('git'))
  else vi.mocked(appApi.getVariables).mockResolvedValue({ data: definitions } as never)
  const wrapper = mount(StepStart, {
    global: {
      plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })],
      stubs: { OpenStackResourcePicker: true },
    },
  })
  await flushPromises()
  return wrapper
}

const lastReason = (wrapper: ReturnType<typeof mount>) => {
  const events = wrapper.emitted('reason') as Array<[unknown]>
  return events[events.length - 1]![0]
}

async function settle() {
  for (let i = 0; i < 10; i++) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('StepStart', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
    const store = useDeploymentStore()
    store.startDraft({ appId: 'ide', appName: 'Online-IDE', releaseTag: 'v1.2.0' })
    Object.assign(store.draft, { name: 'Lab', studentIds: ['u1', 'u2'], groupMode: 'one', targetLabel: 'WI SE B 23' })
    vi.mocked(userApi.getById).mockImplementation(async (id: string) => ({ data: people[id] }) as never)
    vi.mocked(quotasApi.getOverview).mockResolvedValue({ data: { compute: { instances: { used: 12, limit: 30, available: 18 } } } } as never)
  })

  it('zeigt Ressourcen, Pflichtangaben und Dateien offen, alles andere mit Default unter „Erweiterte Einstellungen“', async () => {
    const wrapper = await mountStep([login, taskFile, flavor, network])

    expect(wrapper.get('[data-testid="resource-inputs"]').text()).toContain('Größe der VM')
    expect(wrapper.get('[data-testid="resource-inputs"]').text()).not.toContain('flavor_name')
    expect(wrapper.get('[data-testid="required-inputs"]').text()).toContain('Kürzel des Kurses')
    expect(wrapper.get('[data-testid="file-variable-task_files"]').text()).toContain('Aufgabe je Person')
    const toggle = wrapper.get('[data-testid="btn-advanced"]')
    expect(toggle.text()).toBe('Erweiterte Einstellungen')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('[data-testid="advanced-panel"]').attributes('style')).toContain('display: none')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    const panel = wrapper.get('[data-testid="advanced-panel"]')
    expect(panel.text()).toContain('Netzwerk')
    expect(panel.text()).not.toContain('Größe der VM')
  })

  it('meldet fehlende Angaben, dann fehlende Dateien, als Grund nach oben', async () => {
    const wrapper = await mountStep([login, taskFile])
    expect(lastReason(wrapper)).toEqual({ key: 'deployment.wizard.block.missingInputs', params: { n: 1 }, plural: 1 })

    useDeploymentStore().draft.variables = {}
    await wrapper.get('input#course_code').setValue('WI23')
    await flushPromises()
    expect(lastReason(wrapper)).toEqual({ key: 'deployment.wizard.block.missingFiles', params: { n: 2 }, plural: 2 })
    expect(useDeploymentStore().draft.variables).toEqual({ course_code: 'WI23' })
  })

  it('ordnet mehrere Dateien über den Namen zu und listet „x von y zugeordnet“', async () => {
    const wrapper = await mountStep([taskFile])
    const section = wrapper.get('[data-testid="file-variable-task_files"]')
    expect(section.get('[data-testid="files-assigned"]').text()).toBe('0 von 2 zugeordnet')
    expect(section.text()).toContain('z. B. luca.baeck.txt')

    const files = [new File(['a'], 'luca.baeck.java'), new File(['b'], 'unbekannt.java')]
    await section.get('[data-testid="drop-zone"]').trigger('drop', { dataTransfer: { files } })
    await settle()

    expect(section.get('[data-testid="files-assigned"]').text()).toBe('1 von 2 zugeordnet')
    expect(section.get('[data-testid="files-missing"]').text()).toBe('1 fehlt')
    expect(section.get('[data-testid="unmatched-files"]').text()).toContain('unbekannt.java')
    expect(Object.keys(useDeploymentStore().draft.fileUploads!.task_files!)).toEqual(['Team-1-luca.baeck'])
    expect(lastReason(wrapper)).toEqual({ key: 'deployment.wizard.block.missingFiles', params: { n: 1 }, plural: 1 })

    // The one still missing gets its own "Datei wählen".
    await section.get('[data-testid="pick-Team-1-mika.jun"]').trigger('click')
    const input = section.get<HTMLInputElement>('[data-testid="row-file-input"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['c'], 'egal.java')], configurable: true })
    await input.trigger('change')
    await settle()

    expect(section.get('[data-testid="files-assigned"]').text()).toBe('2 von 2 zugeordnet')
    expect(lastReason(wrapper)).toBeNull()
  })

  it('braucht eine App nichts, zeigt der Schritt nur Hinweis und Zusammenfassung', async () => {
    const wrapper = await mountStep([])
    expect(wrapper.find('[data-testid="nothing-needed"]').exists()).toBe(true)
    expect(lastReason(wrapper)).toBeNull()

    const summary = wrapper.get('[data-testid="wizard-summary"]').text()
    expect(summary).toContain('Online-IDE · v1.2.0')
    expect(summary).toContain('WI SE B 23')
    expect(summary).toContain('Alle zusammen')
    expect(summary).toContain('1 Umgebung für 2 Personen')
    expect(summary).toContain('kann bis zu 90 Min. dauern')
  })

  it('zeigt das freie Kontingent als Info aus der Kontingent-Übersicht', async () => {
    const wrapper = await mountStep([])
    await settle()
    expect(wrapper.get('[data-testid="free-quota"]').text()).toBe('Frei in deinem Kontingent: 18 von 30 VMs.')
  })

  it('lässt bei einem Ladefehler trotzdem starten und sagt warum', async () => {
    const wrapper = await mountStep([], { fail: true })
    expect(wrapper.text()).toContain('Die Einstellungen der App konnten nicht geladen werden.')
    expect(lastReason(wrapper)).toBeNull()
  })

  it('bittet nach einem Reload ohne Dateien, sie erneut zu wählen', async () => {
    useDeploymentStore().draft.filesLost = true
    const wrapper = await mountStep([taskFile])
    expect(wrapper.get('[data-testid="files-lost"]').text()).toContain('Bitte wähle sie erneut')
  })
})
