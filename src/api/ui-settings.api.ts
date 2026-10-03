import api from './axios'
import { env } from '@/env'
import type { LogoVariant, UiSettings, UiSettingsUpdate } from '@/types/ui-settings'

// ----------------------------------------------------------------
// UI SETTINGS API
// ----------------------------------------------------------------
export const uiSettingsApi = {
  /** Readable without a login — the login page uses it. */
  get: () => api.get<UiSettings>('/ui-settings'),

  update: (data: UiSettingsUpdate) => api.patch<UiSettings>('/ui-settings', data),

  /** ``image`` is a ``data:image/...;base64,...`` URL. */
  uploadLogo: (variant: LogoVariant, image: string) =>
    api.put<UiSettings>(`/ui-settings/logos/${variant}`, { image }),

  resetLogo: (variant: LogoVariant) => api.delete<UiSettings>(`/ui-settings/logos/${variant}`),

  /**
   * Address of an uploaded logo for an ``<img>``. ``version`` (the settings'
   * ``updatedAt``) makes every upload a new URL, so the browser cache never
   * shows the previous logo.
   */
  logoUrl: (variant: LogoVariant, version: string | null) => {
    const query = version ? `?v=${encodeURIComponent(version)}` : ''
    return `${env.API_URL}/ui-settings/logos/${variant}${query}`
  },
}
