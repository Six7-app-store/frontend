import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

import StepApp from '@/components/deployment-wizard/StepApp.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDeploymentStore } from '@/stores/deployment.store'
import { appApi } from '@/api/app.api'
import de from '@/i18n/locales/de'

vi.mock('@/api/app.api', () => ({
  appApi: { list: vi.fn(), getById: vi.fn() },
}))

enableAutoUnmount(afterEach)

const apps = [
  { appId: 'ide', name: 'Online-IDE', description: 'Java im Browser', latestApprovedVersion: 'v1.2.0' },
  { appId: 'latex', name: 'Web-LaTeX', description: null, latestApprovedVersion: 'v0.9.0' },
  { appId: 'draft', name: 'Entwurf', description: null, latestApprovedVersion: null },
]

async function mountStep() {
  const wrapper = mount(StepApp, {
    global: { plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })] },
  })
  await flushPromises()
  return wrapper
}

describe('StepApp', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
    vi.mocked(appApi.getById).mockClear()
    vi.mocked(appApi.list).mockResolvedValue({ data: apps } as never)
    vi.mocked(appApi.getById).mockResolvedValue({ data: { versions: [{ version: 'v1.2.0' }, { version: 'v1.1.0' }] } } as never)
  })

  it('listet nur freigegebene Apps als Radiogruppe mit Kurzbeschreibung', async () => {
    const wrapper = await mountStep()
    const radios = wrapper.findAll('[role="radio"]')

    expect(radios.map((r) => r.text())).toEqual(['Online-IDEJava im Browser', 'Web-LaTeXKeine Beschreibung verfügbar.'])
    const group = wrapper.get('[role="radiogroup"]')
    expect(wrapper.get(`#${group.attributes('aria-labelledby')}`).text()).toBe('Welche App möchtest du bereitstellen?')
  })

  it('filtert per Suche und meldet, wenn nichts passt', async () => {
    const wrapper = await mountStep()
    const search = wrapper.get('[data-testid="app-search"]')
    expect(wrapper.get(`label[for="${search.attributes('id')}"]`).text()).toBe('App suchen')

    await search.setValue('latex')
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(1)
    await search.setValue('gibt es nicht')
    expect(wrapper.text()).toContain('Keine App passt zu deiner Suche.')
  })

  it('wählt beim Klick die App mit ihrer neuesten freigegebenen Version', async () => {
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="radio-card-ide"]').trigger('click')

    const draft = useDeploymentStore().draft
    expect([draft.appId, draft.appName, draft.releaseTag]).toEqual(['ide', 'Online-IDE', 'v1.2.0'])
    expect(wrapper.get('[data-testid="chosen-version"]').text()).toBe('v1.2.0')
    expect(wrapper.get('[data-testid="version-panel"]').text()).toContain('neueste freigegebene Version')
  })

  it('zeigt nach der App-Wahl sofort alle Versionen und übernimmt eine andere', async () => {
    const wrapper = await mountStep()
    expect(appApi.getById).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="radio-card-ide"]').trigger('click')
    await flushPromises()

    expect(appApi.getById).toHaveBeenCalledWith('ide')
    const select = wrapper.get('[data-testid="version-select"]')
    expect(select.findAll('option').map((o) => o.text())).toEqual(['v1.2.0', 'v1.1.0'])

    await select.setValue('v1.1.0')
    expect(useDeploymentStore().draft.releaseTag).toBe('v1.1.0')
    expect(wrapper.get('[data-testid="version-panel"]').text()).toContain('von dir gewählte Version')
  })

  it('lädt die Versionen einer wiederhergestellten App ohne neue Wahl', async () => {
    setActivePinia(createPinia())
    useDeploymentStore().chooseRelease({ appId: 'ide', appName: 'Online-IDE', releaseTag: 'v1.2.0' })
    const wrapper = await mountStep()

    expect(appApi.getById).toHaveBeenCalledWith('ide')
    expect(wrapper.findAll('[data-testid="version-select"] option')).toHaveLength(2)
  })

  it('bietet ohne Versionsliste die vorgewählte Version an', async () => {
    vi.mocked(appApi.getById).mockResolvedValueOnce({ data: { versions: [] } } as never)
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="radio-card-ide"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="version-select"] option').map((o) => o.text())).toEqual(['v1.2.0'])
  })

  it('meldet einen Fehler beim Laden der Versionen als Text', async () => {
    vi.mocked(appApi.getById).mockRejectedValueOnce(new Error('git'))
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="radio-card-ide"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Die Versionen konnten nicht geladen werden.')
  })

  it('zeigt eigene, noch nicht freigegebene Apps und wählt ihre neueste Git-Version vor', async () => {
    useAuthStore().user = { userId: 'me' } as never
    vi.mocked(appApi.list).mockResolvedValue({
      data: [...apps, { appId: 'kuber', name: 'Kuber', description: null, latestApprovedVersion: null, userId: 'me' }],
    } as never)
    vi.mocked(appApi.getById).mockResolvedValue({ data: { versions: [{ version: 'v1.0.1' }, { version: 'v1.0.0' }] } } as never)
    const wrapper = await mountStep()

    // Own draft listed and marked; someone else's draft stays hidden.
    expect(wrapper.findAll('[role="radio"]').map((r) => r.text())).toEqual([
      'KuberKeine Beschreibung verfügbar. · noch nicht freigegeben',
      'Online-IDEJava im Browser',
      'Web-LaTeXKeine Beschreibung verfügbar.',
    ])

    await wrapper.get('[data-testid="radio-card-kuber"]').trigger('click')
    await flushPromises()

    expect(useDeploymentStore().draft.releaseTag).toBe('v1.0.1')
    expect(wrapper.get('[data-testid="chosen-version"]').text()).toBe('v1.0.1')
    expect(wrapper.find('[data-testid="unapproved-hint"]').exists()).toBe(true)
  })

  it('meldet eine eigene App ohne jede Version', async () => {
    useAuthStore().user = { userId: 'me' } as never
    vi.mocked(appApi.list).mockResolvedValue({
      data: [{ appId: 'neu', name: 'Neu', description: null, latestApprovedVersion: null, userId: 'me' }],
    } as never)
    vi.mocked(appApi.getById).mockResolvedValue({ data: { versions: [] } } as never)
    const wrapper = await mountStep()
    await wrapper.get('[data-testid="radio-card-neu"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="no-versions"]').text()).toContain('Diese App hat noch keine Version.')
    expect(useDeploymentStore().draft.releaseTag).toBe('')
  })

  it('bietet bei einem Ladefehler der Apps „Erneut versuchen“ an', async () => {
    vi.mocked(appApi.list).mockRejectedValueOnce(new Error('down'))
    const wrapper = await mountStep()
    expect(wrapper.text()).toContain('Die Apps konnten nicht geladen werden.')

    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(2)
  })
})
