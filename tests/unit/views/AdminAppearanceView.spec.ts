/**
 * Verwaltung → Darstellung: three logo tiles that upload on choice and reset
 * on request, and the accent colour with its live preview, save and reset.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

const uiSettingsApi = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  uploadLogo: vi.fn(),
  resetLogo: vi.fn(),
  logoUrl: (variant: string, version: string | null) => `/ui-settings/logos/${variant}?v=${version}`,
}))
vi.mock('@/api/ui-settings.api', () => ({ uiSettingsApi }))
vi.mock('@/utils/design-tokens', () => ({
  tokenTriplet: (_theme: string, name: string) => (name === 'accent' ? [226, 0, 26] : null),
}))

import AdminAppearanceView from '@/views/AdminAppearanceView.vue'
import { useUiSettingsStore } from '@/stores/ui-settings.store'

const settings = (overrides: Record<string, unknown> = {}) => ({
  accentColor: null,
  logos: { light: false, dark: false, icon: false },
  updatedAt: 'v1',
  ...overrides,
})

const mountView = () => mount(AdminAppearanceView, { global: { mocks: { $t: (key: string) => key } } })

const button = (wrapper: ReturnType<typeof mountView>, within: string, text: string) =>
  wrapper.get(within).findAll('button').find((b) => b.text().includes(text))

const chooseFile = async (wrapper: ReturnType<typeof mountView>, variant: string, file: File) => {
  const input = wrapper.get(`[data-test="logo-${variant}"] input[type="file"]`)
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  // Reading the file goes through FileReader, which settles on a later task.
  await vi.waitFor(() => expect(toast.success.mock.calls.length + toast.error.mock.calls.length).toBe(1))
  await flushPromises()
}

describe('AdminAppearanceView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('zeigt je Logo die Vorschau auf passendem Grund und den Standard-Status', () => {
    const wrapper = mountView()

    const light = wrapper.get('[data-test="logo-light"]')
    expect(light.get('.logo-preview-light img').attributes('src')).toContain('based-logo-light')
    expect(wrapper.get('[data-test="logo-dark"] .logo-preview-dark img').attributes('src')).toContain('based-logo-dark')
    expect(wrapper.get('[data-test="logo-icon"] img').attributes('src')).toContain('based-icon')
    expect(light.text()).toContain('AdminAppearanceView.logos.default')
    // Nothing to reset while the default applies.
    expect(button(wrapper, '[data-test="logo-light"]', 'logos.reset')).toBeUndefined()
  })

  it('lädt ein gewähltes Logo sofort hoch und zeigt es an', async () => {
    uiSettingsApi.uploadLogo.mockResolvedValueOnce({ data: settings({ logos: { light: false, dark: true, icon: false }, updatedAt: 'v2' }) })
    const wrapper = mountView()

    await chooseFile(wrapper, 'dark', new File(['png'], 'dark.png', { type: 'image/png' }))

    expect(uiSettingsApi.uploadLogo).toHaveBeenCalledWith('dark', expect.stringMatching(/^data:image\/png;base64,/))
    expect(toast.success).toHaveBeenCalledWith('AdminAppearanceView.logos.uploadSuccess')
    const tile = wrapper.get('[data-test="logo-dark"]')
    expect(tile.get('img').attributes('src')).toBe('/ui-settings/logos/dark?v=v2')
    expect(tile.text()).toContain('AdminAppearanceView.logos.custom')
    expect(button(wrapper, '[data-test="logo-dark"]', 'logos.replace')).toBeDefined()
  })

  it('weist eine Nicht-Bild-Datei ohne Upload ab', async () => {
    const wrapper = mountView()

    await chooseFile(wrapper, 'light', new File(['x'], 'notes.txt', { type: 'text/plain' }))

    expect(uiSettingsApi.uploadLogo).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('image.onlyImages')
  })

  it('meldet einen gescheiterten Upload', async () => {
    uiSettingsApi.uploadLogo.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountView()

    await chooseFile(wrapper, 'icon', new File(['png'], 'icon.png', { type: 'image/png' }))

    expect(toast.error).toHaveBeenCalledWith('AdminAppearanceView.logos.uploadError')
  })

  it('setzt ein eigenes Logo auf den Standard zurück', async () => {
    useUiSettingsStore().store(settings({ logos: { light: true, dark: false, icon: false } }))
    uiSettingsApi.resetLogo.mockResolvedValueOnce({ data: settings() })
    const wrapper = mountView()

    await button(wrapper, '[data-test="logo-light"]', 'logos.reset')!.trigger('click')
    await flushPromises()

    expect(uiSettingsApi.resetLogo).toHaveBeenCalledWith('light')
    expect(toast.success).toHaveBeenCalledWith('AdminAppearanceView.logos.resetSuccess')
    expect(wrapper.get('[data-test="logo-light"] img').attributes('src')).toContain('based-logo-light')
  })

  it('zeigt eine geänderte Akzentfarbe als Vorschau und speichert sie', async () => {
    const store = useUiSettingsStore()
    uiSettingsApi.update.mockResolvedValueOnce({ data: settings({ accentColor: '#1A73E8' }) })
    const wrapper = mountView()
    const save = wrapper.get('[data-test="accent-save"]')
    expect(save.attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="accent-input"]').setValue('#1a73e8')

    expect(store.effectiveAccent).toBe('#1A73E8')
    expect(wrapper.text()).toContain('AdminAppearanceView.accent.previewNote')
    expect(save.attributes('disabled')).toBeUndefined()

    await save.trigger('click')
    await flushPromises()

    expect(uiSettingsApi.update).toHaveBeenCalledWith({ accentColor: '#1A73E8' })
    expect(toast.success).toHaveBeenCalledWith('AdminAppearanceView.accent.saveSuccess')
    expect(wrapper.text()).not.toContain('AdminAppearanceView.accent.previewNote')
    expect(wrapper.find('[data-test="accent-reset"]').exists()).toBe(true)
  })

  it('übernimmt eine Farbe aus dem Farbwähler', async () => {
    const wrapper = mountView()

    await wrapper.get('input[type="color"]').setValue('#00c853')

    expect((wrapper.get('[data-test="accent-input"]').element as HTMLInputElement).value).toBe('#00C853')
  })

  it('erklärt eine ungültige Eingabe und speichert sie nicht', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="accent-input"]').setValue('blau')

    expect(wrapper.get('[role="alert"]').text()).toBe('AdminAppearanceView.accent.invalid')
    expect(wrapper.get('[data-test="accent-save"]').attributes('disabled')).toBeDefined()
  })

  it('verwirft eine Vorschau beim Verlassen der Seite', async () => {
    const store = useUiSettingsStore()
    const wrapper = mountView()
    await wrapper.get('[data-test="accent-input"]').setValue('#1A73E8')

    wrapper.unmount()

    expect(store.effectiveAccent).toBeNull()
  })

  it('setzt eine eigene Akzentfarbe auf den Standard zurück', async () => {
    useUiSettingsStore().store(settings({ accentColor: '#1A73E8' }))
    uiSettingsApi.update.mockResolvedValueOnce({ data: settings() })
    const wrapper = mountView()

    await wrapper.get('[data-test="accent-reset"]').trigger('click')
    await flushPromises()

    expect(uiSettingsApi.update).toHaveBeenCalledWith({ accentColor: null })
    expect(toast.success).toHaveBeenCalledWith('AdminAppearanceView.accent.resetSuccess')
    expect(wrapper.find('[data-test="accent-reset"]').exists()).toBe(false)
  })
})
