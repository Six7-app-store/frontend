/** The three logos an admin can replace. */
export type LogoVariant = 'light' | 'dark' | 'icon'

export const LOGO_VARIANTS: readonly LogoVariant[] = ['light', 'dark', 'icon']

/** ``GET /ui-settings``. ``null`` / ``false`` mean the built-in default applies. */
export interface UiSettings {
  /** ``#RRGGBB`` */
  accentColor: string | null
  logos: Record<LogoVariant, boolean>
  /** Changes on every save; versions the logo URLs. */
  updatedAt: string | null
}

export interface UiSettingsUpdate {
  /** ``null`` resets to the built-in accent. */
  accentColor: string | null
}
