import { computed, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useUiSettingsStore } from '@/stores/ui-settings.store'
import {
  BLACK,
  WHITE,
  accentPaletteCss,
  deriveAccentPalette,
  hexToRgb,
  rgbToHex,
} from '@/services/accent-palette.service'
import { tokenTriplet } from '@/utils/design-tokens'
import { UI_ACCENT_CSS_STORAGE_KEY } from '@/utils/storage-keys'

import defaultLogoLight from '@/assets/based-logo-light.png'
import defaultLogoDark from '@/assets/based-logo-dark.png'
import defaultLogoIcon from '@/assets/based-icon.png'

/** Same id as the pre-paint script in index.html, so both write one element. */
export const ACCENT_STYLE_ID = 'ui-accent'

const DEFAULT_FAVICON = '/based-icon.png'

/** The built-in accent as ``#RRGGBB`` — the colour picker's starting point. */
export function defaultAccentHex(): string | null {
  const accent = tokenTriplet('light', 'accent')
  return accent ? rgbToHex(accent) : null
}

/** The stylesheet that turns the built-in accent into ``hex``; empty for the default. */
export function accentCssFor(hex: string | null): string {
  const accent = hex ? hexToRgb(hex) : null
  if (!accent) return ''
  const surfaces = (theme: 'light' | 'dark', fallback: typeof WHITE) =>
    ['surface', 'canvas'].map((name) => tokenTriplet(theme, name) ?? fallback)
  const palette = deriveAccentPalette(
    accent,
    { light: surfaces('light', WHITE), dark: surfaces('dark', BLACK) },
    // Pure black, not the heading tone: only white or black reaches 4.5:1 on
    // every possible fill.
    { light: tokenTriplet('light', 'on-accent') ?? WHITE, dark: BLACK },
  )
  return accentPaletteCss(palette)
}

function accentStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(ACCENT_STYLE_ID)
  if (existing instanceof HTMLStyleElement) return existing
  const el = document.createElement('style')
  el.id = ACCENT_STYLE_ID
  document.head.appendChild(el)
  return el
}

function cacheAccentCss(css: string) {
  try {
    if (css) localStorage.setItem(UI_ACCENT_CSS_STORAGE_KEY, css)
    else localStorage.removeItem(UI_ACCENT_CSS_STORAGE_KEY)
  } catch {
    // Storage unavailable: the built-in accent shows until the settings load.
  }
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  // The type in index.html says PNG; an uploaded icon may be anything.
  link.removeAttribute('type')
  link.href = href
}

/**
 * Logos and accent as an admin configured them (Verwaltung → Darstellung),
 * each falling back to the built-in one on its own.
 */
export function useBranding() {
  const store = useUiSettingsStore()
  const { isDark } = useTheme()

  const logoLight = computed(() => store.logoUrl('light') ?? defaultLogoLight)
  const logoDark = computed(() => store.logoUrl('dark') ?? defaultLogoDark)
  const logoIcon = computed(() => store.logoUrl('icon') ?? defaultLogoIcon)
  /** The wordmark for the active theme. */
  const logo = computed(() => (isDark.value ? logoDark.value : logoLight.value))

  return { logo, logoLight, logoDark, logoIcon }
}

/**
 * Loads the settings and keeps the page in step with them: the accent
 * stylesheet (a preview included), its cached copy for the next first
 * paint, and the favicon. Called once from main.ts.
 */
export function installBranding() {
  const store = useUiSettingsStore()

  watch(
    () => store.effectiveAccent,
    (hex) => {
      accentStyleElement().textContent = accentCssFor(hex)
    },
    { immediate: true },
  )
  // Only what is saved goes to the cache; a preview must not outlive the page.
  watch(
    () => store.settings.accentColor,
    (hex) => cacheAccentCss(accentCssFor(hex)),
    { immediate: true },
  )
  watch(
    () => store.logoUrl('icon'),
    (url) => setFavicon(url ?? DEFAULT_FAVICON),
    { immediate: true },
  )

  void store.fetch()
}
