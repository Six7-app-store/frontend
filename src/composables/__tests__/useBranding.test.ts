import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const uiSettingsApi = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  uploadLogo: vi.fn(),
  resetLogo: vi.fn(),
  logoUrl: (variant: string, version: string | null) => `/ui-settings/logos/${variant}?v=${version}`,
}))
vi.mock('@/api/ui-settings.api', () => ({ uiSettingsApi }))

// vitest blanks the stylesheet; the built-in accent is the one value read here.
vi.mock('@/utils/design-tokens', () => ({
  tokenTriplet: (_theme: string, name: string) => (name === 'accent' ? [226, 0, 26] : null),
}))

import { ACCENT_STYLE_ID, accentCssFor, defaultAccentHex, installBranding, useBranding } from '../useBranding'
import { useUiSettingsStore } from '@/stores/ui-settings.store'
import { useTheme } from '@/composables/useTheme'
import { UI_ACCENT_CSS_STORAGE_KEY } from '@/utils/storage-keys'

const settings = (overrides: Record<string, unknown> = {}) => ({
  accentColor: null,
  logos: { light: false, dark: false, icon: false },
  updatedAt: 'v1',
  ...overrides,
})

const styleText = () => document.getElementById(ACCENT_STYLE_ID)?.textContent ?? null
const favicon = () => document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href')

describe('useBranding', () => {
  let scope: ReturnType<typeof effectScope>

  beforeEach(() => {
    localStorage.clear()
    document.head.innerHTML = '<link rel="icon" type="image/png" href="/based-icon.png" />'
    document.documentElement.removeAttribute('data-theme')
    setActivePinia(createPinia())
    uiSettingsApi.get.mockReset().mockResolvedValue({ data: settings() })
    scope = effectScope()
  })

  afterEach(() => scope.stop())

  it('spells out the built-in accent for the colour picker', () => {
    expect(defaultAccentHex()).toBe('#E2001A')
  })

  it('needs no stylesheet for the built-in accent', () => {
    expect(accentCssFor(null)).toBe('')
    expect(accentCssFor('not a colour')).toBe('')
    expect(accentCssFor('#1A73E8')).toContain('--color-accent: 26 115 232;')
  })

  it('falls back to the built-in logos one by one', () => {
    const store = useUiSettingsStore()
    const { logo, logoIcon } = scope.run(() => useBranding())!

    expect(logo.value).toContain('based-logo-light')
    expect(logoIcon.value).toContain('based-icon')

    store.store(settings({ logos: { light: true, dark: false, icon: false } }))
    expect(logo.value).toBe('/ui-settings/logos/light?v=v1')

    useTheme().toggleTheme()
    expect(logo.value).toContain('based-logo-dark')
    useTheme().toggleTheme()
  })

  it('loads the settings and applies the saved accent, its cache and the icon', async () => {
    uiSettingsApi.get.mockResolvedValueOnce({
      data: settings({ accentColor: '#1A73E8', logos: { light: false, dark: false, icon: true } }),
    })

    scope.run(() => installBranding())
    await vi.waitFor(() => expect(styleText()).toContain('--color-accent: 26 115 232;'))

    expect(localStorage.getItem(UI_ACCENT_CSS_STORAGE_KEY)).toBe(styleText())
    expect(favicon()).toBe('/ui-settings/logos/icon?v=v1')
    expect(document.querySelector('link[rel="icon"]')?.hasAttribute('type')).toBe(false)
  })

  it('reuses the element the pre-paint script created', async () => {
    document.head.insertAdjacentHTML('beforeend', `<style id="${ACCENT_STYLE_ID}">cached</style>`)

    scope.run(() => installBranding())
    await nextTick()

    expect(document.querySelectorAll(`#${ACCENT_STYLE_ID}`)).toHaveLength(1)
  })

  it('previews an accent on the page without caching it', async () => {
    const store = useUiSettingsStore()
    scope.run(() => installBranding())
    await vi.waitFor(() => expect(uiSettingsApi.get).toHaveBeenCalled())

    store.previewAccentColor('#00C853')
    await nextTick()

    expect(styleText()).toContain('--color-accent: 0 200 83;')
    expect(localStorage.getItem(UI_ACCENT_CSS_STORAGE_KEY)).toBeNull()

    store.clearPreview()
    await nextTick()
    expect(styleText()).toBe('')
  })

  it('drops the cache and the icon once the defaults apply again', async () => {
    const store = useUiSettingsStore()
    store.store(settings({ accentColor: '#1A73E8', logos: { light: false, dark: false, icon: true } }))
    uiSettingsApi.get.mockResolvedValueOnce({ data: settings() })

    scope.run(() => installBranding())
    await vi.waitFor(() => expect(styleText()).toBe(''))

    expect(localStorage.getItem(UI_ACCENT_CSS_STORAGE_KEY)).toBeNull()
    expect(favicon()).toBe('/based-icon.png')
  })
})
