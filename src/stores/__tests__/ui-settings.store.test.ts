import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const uiSettingsApi = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  uploadLogo: vi.fn(),
  resetLogo: vi.fn(),
  logoUrl: (variant: string, version: string | null) => `/ui-settings/logos/${variant}?v=${version}`,
}))
vi.mock('@/api/ui-settings.api', () => ({ uiSettingsApi }))

import { useUiSettingsStore } from '../ui-settings.store'
import { UI_SETTINGS_STORAGE_KEY } from '@/utils/storage-keys'

const settings = (overrides: Record<string, unknown> = {}) => ({
  accentColor: null,
  logos: { light: false, dark: false, icon: false },
  updatedAt: null,
  ...overrides,
})

const httpError = (status: number, detail?: unknown) =>
  Object.assign(new Error('Request failed'), { response: { status, data: { detail } } })

describe('UI settings store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    uiSettingsApi.get.mockReset()
    uiSettingsApi.update.mockReset()
    uiSettingsApi.uploadLogo.mockReset()
    uiSettingsApi.resetLogo.mockReset()
  })

  it('starts with the built-in defaults', () => {
    const store = useUiSettingsStore()

    expect(store.settings).toEqual(settings())
    expect(store.effectiveAccent).toBeNull()
    expect(store.logoUrl('light')).toBeNull()
  })

  it('starts from the settings of the last visit', () => {
    localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(settings({ accentColor: '#1A73E8', logos: { dark: true } })))

    const store = useUiSettingsStore()

    expect(store.settings.accentColor).toBe('#1A73E8')
    // A partial cache is filled up with the defaults.
    expect(store.settings.logos).toEqual({ light: false, dark: true, icon: false })
  })

  it('ignores a corrupt cache', () => {
    localStorage.setItem(UI_SETTINGS_STORAGE_KEY, '{not json')

    expect(useUiSettingsStore().settings).toEqual(settings())
  })

  it('loads and caches the settings', async () => {
    uiSettingsApi.get.mockResolvedValueOnce({ data: settings({ accentColor: '#1A73E8' }) })
    const store = useUiSettingsStore()

    await store.fetch()

    expect(store.settings.accentColor).toBe('#1A73E8')
    expect(JSON.parse(localStorage.getItem(UI_SETTINGS_STORAGE_KEY) as string).accentColor).toBe('#1A73E8')
  })

  it('keeps what it has when loading fails', async () => {
    localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(settings({ accentColor: '#1A73E8' })))
    uiSettingsApi.get.mockRejectedValueOnce(httpError(502))
    const store = useUiSettingsStore()

    await expect(store.fetch()).resolves.toBeUndefined()
    expect(store.settings.accentColor).toBe('#1A73E8')
  })

  it('builds versioned URLs only for uploaded logos', () => {
    const store = useUiSettingsStore()
    store.store(settings({ logos: { light: true, dark: false, icon: true }, updatedAt: 'v1' }))

    expect(store.logoUrl('light')).toBe('/ui-settings/logos/light?v=v1')
    expect(store.logoUrl('dark')).toBeNull()
    expect(store.logoUrl('icon')).toBe('/ui-settings/logos/icon?v=v1')
  })

  it('shows a preview over the saved accent, the built-in one included', () => {
    const store = useUiSettingsStore()
    store.store(settings({ accentColor: '#1A73E8' }))

    store.previewAccentColor('#00C853')
    expect(store.effectiveAccent).toBe('#00C853')

    store.previewAccentColor(null)
    expect(store.effectiveAccent).toBeNull()

    store.clearPreview()
    expect(store.effectiveAccent).toBe('#1A73E8')
  })

  it('saves the accent and ends the preview', async () => {
    uiSettingsApi.update.mockResolvedValueOnce({ data: settings({ accentColor: '#00C853', updatedAt: 'v2' }) })
    const store = useUiSettingsStore()
    store.previewAccentColor('#00C853')

    await store.saveAccent('#00C853')

    expect(uiSettingsApi.update).toHaveBeenCalledWith({ accentColor: '#00C853' })
    expect(store.settings.accentColor).toBe('#00C853')
    expect(store.previewAccent).toBeUndefined()
  })

  it('keeps the backend message and the preview of a failed save', async () => {
    uiSettingsApi.update.mockRejectedValueOnce(httpError(403, 'Not allowed'))
    const store = useUiSettingsStore()
    store.previewAccentColor('#00C853')

    await expect(store.saveAccent('#00C853')).rejects.toBeDefined()
    expect(store.error).toBe('Not allowed')
    expect(store.previewAccent).toBe('#00C853')
  })

  it('uploads and resets a logo', async () => {
    uiSettingsApi.uploadLogo.mockResolvedValueOnce({ data: settings({ logos: { light: false, dark: true, icon: false } }) })
    uiSettingsApi.resetLogo.mockResolvedValueOnce({ data: settings() })
    const store = useUiSettingsStore()

    await store.uploadLogo('dark', 'data:image/png;base64,AAAA')
    expect(uiSettingsApi.uploadLogo).toHaveBeenCalledWith('dark', 'data:image/png;base64,AAAA')
    expect(store.settings.logos.dark).toBe(true)

    await store.resetLogo('dark')
    expect(uiSettingsApi.resetLogo).toHaveBeenCalledWith('dark')
    expect(store.settings.logos.dark).toBe(false)
  })
})
