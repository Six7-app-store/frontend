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
vi.mock('@/utils/design-tokens', () => ({
  tokenTriplet: (_theme: string, name: string) => (name === 'accent' ? [226, 0, 26] : null),
}))

import { useAppearanceSettings } from '../useAppearanceSettings'
import { useUiSettingsStore } from '@/stores/ui-settings.store'
import { MAX_IMAGE_BYTES } from '@/utils/file'

const settings = (overrides: Record<string, unknown> = {}) => ({
  accentColor: null,
  logos: { light: false, dark: false, icon: false },
  updatedAt: 'v1',
  ...overrides,
})

const png = (size = 10) => new File([new Uint8Array(size)], 'logo.png', { type: 'image/png' })

describe('useAppearanceSettings', () => {
  let scope: ReturnType<typeof effectScope>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    ;[uiSettingsApi.get, uiSettingsApi.update, uiSettingsApi.uploadLogo, uiSettingsApi.resetLogo].forEach((fn) => fn.mockReset())
    scope = effectScope()
  })

  afterEach(() => scope.stop())

  const setup = () => scope.run(() => useAppearanceSettings())!

  it('starts the draft at the built-in accent', () => {
    const page = setup()

    expect(page.draft.value).toBe('#E2001A')
    expect(page.isDirty.value).toBe(false)
    expect(page.hasCustomAccent.value).toBe(false)
  })

  it('previews a changed draft and stops when it matches again', async () => {
    const store = useUiSettingsStore()
    const page = setup()

    page.draft.value = '#1a73e8'
    await nextTick()
    expect(page.isDirty.value).toBe(true)
    expect(store.effectiveAccent).toBe('#1A73E8')

    page.draft.value = '#e2001a'
    await nextTick()
    expect(page.isDirty.value).toBe(false)
    expect(store.previewAccent).toBeUndefined()
  })

  it('neither previews nor saves an invalid draft', async () => {
    const store = useUiSettingsStore()
    const page = setup()

    page.draft.value = '#12'
    await nextTick()

    expect(page.isDraftValid.value).toBe(false)
    expect(page.isDirty.value).toBe(false)
    expect(store.previewAccent).toBeUndefined()
    await page.saveAccent()
    expect(uiSettingsApi.update).not.toHaveBeenCalled()
  })

  it('drops the preview when the page is left', async () => {
    const store = useUiSettingsStore()
    const page = setup()
    page.draft.value = '#1A73E8'
    await nextTick()

    scope.stop()

    expect(store.previewAccent).toBeUndefined()
  })

  it('saves the normalised draft and follows the saved value', async () => {
    uiSettingsApi.update.mockResolvedValueOnce({ data: settings({ accentColor: '#1A73E8' }) })
    const page = setup()
    page.draft.value = '1a73e8'
    await nextTick()

    await page.saveAccent()
    await nextTick()

    expect(uiSettingsApi.update).toHaveBeenCalledWith({ accentColor: '#1A73E8' })
    expect(page.draft.value).toBe('#1A73E8')
    expect(page.isDirty.value).toBe(false)
    expect(page.hasCustomAccent.value).toBe(true)
  })

  it('resets to the built-in accent and discards an edit', async () => {
    const store = useUiSettingsStore()
    store.store(settings({ accentColor: '#1A73E8' }))
    uiSettingsApi.update.mockResolvedValueOnce({ data: settings() })
    const page = setup()

    page.draft.value = '#00C853'
    page.discardAccent()
    expect(page.draft.value).toBe('#1A73E8')

    await page.resetAccent()
    await nextTick()
    expect(uiSettingsApi.update).toHaveBeenCalledWith({ accentColor: null })
    expect(page.draft.value).toBe('#E2001A')
  })

  it('uploads a logo as a data URL', async () => {
    uiSettingsApi.uploadLogo.mockResolvedValueOnce({ data: settings({ logos: { light: true, dark: false, icon: false } }) })
    const page = setup()

    const pending = page.uploadLogo('light', png())
    expect(page.busyLogo.value).toBe('light')

    await expect(pending).resolves.toBeNull()
    expect(uiSettingsApi.uploadLogo).toHaveBeenCalledWith('light', expect.stringMatching(/^data:image\/png;base64,/))
    expect(page.busyLogo.value).toBeNull()
  })

  it.each([
    ['not_image', new File(['x'], 'logo.txt', { type: 'text/plain' })],
    ['too_large', png(MAX_IMAGE_BYTES + 1)],
  ])('refuses a file that is %s without uploading', async (problem, file) => {
    const page = setup()

    await expect(page.uploadLogo('icon', file)).resolves.toBe(problem)
    expect(uiSettingsApi.uploadLogo).not.toHaveBeenCalled()
  })

  it('frees the logo buttons again after a failure', async () => {
    uiSettingsApi.resetLogo.mockRejectedValueOnce(new Error('offline'))
    const page = setup()

    await expect(page.resetLogo('dark')).rejects.toThrow()
    expect(page.busyLogo.value).toBeNull()
  })
})
