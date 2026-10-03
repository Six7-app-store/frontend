import { defineStore } from 'pinia'
import { uiSettingsApi } from '@/api/ui-settings.api'
import { requestContext, runRequest } from './_request'
import { UI_SETTINGS_STORAGE_KEY } from '@/utils/storage-keys'
import type { LogoVariant, UiSettings } from '@/types/ui-settings'

interface State {
  settings: UiSettings
  /**
   * An accent shown but not saved yet — the appearance page previews a
   * choice on the whole app before the admin commits it. ``undefined``
   * means no preview; ``null`` previews the built-in accent.
   */
  previewAccent: string | null | undefined
  isLoading: boolean
  error: string | null
}

const defaults = (): UiSettings => ({
  accentColor: null,
  logos: { light: false, dark: false, icon: false },
  updatedAt: null,
})

function readCached(): UiSettings {
  try {
    const raw = localStorage.getItem(UI_SETTINGS_STORAGE_KEY)
    if (!raw) return defaults()
    const cached = JSON.parse(raw) as Partial<UiSettings>
    return { ...defaults(), ...cached, logos: { ...defaults().logos, ...cached.logos } }
  } catch {
    return defaults()
  }
}

function writeCached(settings: UiSettings) {
  try {
    localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable: the defaults flash briefly on the next load, nothing else.
  }
}

/**
 * The instance's look as an admin configured it: accent colour and logos.
 * Applying it to the page is ``useBranding``'s job; this holds the data.
 */
export const useUiSettingsStore = defineStore('ui-settings', {
  state: (): State => ({
    settings: readCached(),
    previewAccent: undefined,
    isLoading: false,
    error: null,
  }),

  getters: {
    /** The accent the page shows right now: a preview, else the saved one. */
    effectiveAccent: (s): string | null => (s.previewAccent !== undefined ? s.previewAccent : s.settings.accentColor),
    /** URL of an uploaded logo, or ``null`` when the built-in one applies. */
    logoUrl:
      (s) =>
      (variant: LogoVariant): string | null =>
        s.settings.logos[variant] ? uiSettingsApi.logoUrl(variant, s.settings.updatedAt) : null,
  },

  actions: {
    store(settings: UiSettings) {
      this.settings = settings
      writeCached(settings)
    },

    /** Loads the settings. A failure keeps the cached or default look — it is never worth an error. */
    async fetch() {
      try {
        const res = await uiSettingsApi.get()
        this.store(res.data)
      } catch {
        // Backend unreachable: the login page still renders with what we have.
      }
    },

    async saveAccent(accentColor: string | null) {
      const res = await runRequest(
        requestContext(this),
        () => uiSettingsApi.update({ accentColor }),
        'Failed to save accent colour',
      )
      this.store(res.data)
      this.previewAccent = undefined
    },

    async uploadLogo(variant: LogoVariant, dataUrl: string) {
      const res = await runRequest(
        requestContext(this),
        () => uiSettingsApi.uploadLogo(variant, dataUrl),
        'Failed to upload logo',
      )
      this.store(res.data)
    },

    async resetLogo(variant: LogoVariant) {
      const res = await runRequest(
        requestContext(this),
        () => uiSettingsApi.resetLogo(variant),
        'Failed to reset logo',
      )
      this.store(res.data)
    },

    previewAccentColor(accentColor: string | null) {
      this.previewAccent = accentColor
    },

    clearPreview() {
      this.previewAccent = undefined
    },
  },
})
