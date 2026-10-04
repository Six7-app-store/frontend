/**
 * Derives the accent tokens of ``styles/tokens.css`` from one colour an admin
 * picked, and renders them as the CSS that overrides the built-in red.
 *
 * Only the picked colour is stored; hover, gradient and text shades follow
 * from it here. The text and focus shades are pushed darker (light theme) or
 * lighter (dark theme) until they reach the same contrast the token test
 * demands of the built-in values, so no choice can make links unreadable.
 *
 * No colour literals here — the surfaces the contrast is checked against are
 * the tokens' own triplets, passed in by the caller.
 */

export type Rgb = [number, number, number]

/** Accent tokens that are the same in both themes. */
export interface AccentTokens {
  accent: Rgb
  accentStrong: Rgb
  accentShade: Rgb
  accentBright: Rgb
  accentDeep: Rgb
  accentFg: Rgb
  onAccent: Rgb
  focus: Rgb
}

export interface AccentPalette {
  light: AccentTokens
  /** Only what differs in the dark theme. */
  dark: Pick<AccentTokens, 'accentFg' | 'focus'>
}

/** The backgrounds a theme's accent text and focus ring must stand out from. */
export interface ThemeSurfaces {
  light: Rgb[]
  dark: Rgb[]
}

/** The two label colours tried on an accent fill, preferred first. */
export interface LabelColours {
  light: Rgb
  dark: Rgb
}

export const BLACK: Rgb = [0, 0, 0]
export const WHITE: Rgb = [255, 255, 255]

/** WCAG contrast for text, and for focus rings and other non-text marks. */
const TEXT_CONTRAST = 4.5
const MARK_CONTRAST = 3

const HEX_RE = /^#?([0-9a-f]{6})$/i

export function isAccentHex(value: string): boolean {
  return HEX_RE.test(value.trim())
}

/** ``#rrggbb`` (the leading ``#`` optional) to a triplet; ``null`` when malformed. */
export function hexToRgb(value: string): Rgb | null {
  const match = HEX_RE.exec(value.trim())
  if (!match) return null
  const n = parseInt(match[1] as string, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(rgb: Rgb): string {
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** ``value`` as ``#RRGGBB`` — the form the backend stores — or ``null`` when malformed. */
export function normalizeAccentHex(value: string): string | null {
  const rgb = hexToRgb(value)
  return rgb ? rgbToHex(rgb) : null
}

/** ``"226 0 26"`` — the form tokens.css stores colours in; ``null`` when malformed. */
export function parseTriplet(value: string): Rgb | null {
  const parts = value.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null
  return parts as Rgb
}

/** ``a`` moved by ``amount`` (0…1) towards ``b``. */
export function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return a.map((v, i) => Math.round(v + ((b[i] as number) - v) * amount)) as Rgb
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const minContrast = (colour: Rgb, backgrounds: Rgb[]) =>
  Math.min(...backgrounds.map((bg) => contrast(colour, bg)))

/**
 * ``colour`` moved towards ``target`` just far enough to reach ``ratio``
 * against every background. Black and white always get there on the
 * surfaces this is used with, so the loop ends with a readable colour.
 */
function readableShade(colour: Rgb, target: Rgb, backgrounds: Rgb[], ratio: number): Rgb {
  for (let step = 0; step <= 50; step++) {
    const candidate = mix(colour, target, step / 50)
    if (minContrast(candidate, backgrounds) >= ratio) return candidate
  }
  return target
}

export function deriveAccentPalette(accent: Rgb, surfaces: ThemeSurfaces, labels: LabelColours): AccentPalette {
  // A plain mix keeps the hue; the amounts reproduce the built-in red's
  // shade and deep tokens (see its test).
  const accentShade = mix(accent, BLACK, 0.21)
  const accentStrong = mix(accent, BLACK, 0.41)
  const accentDeep = mix(accent, BLACK, 0.81)
  const accentBright = mix(accent, WHITE, 0.15)

  const lightFg = readableShade(accent, BLACK, surfaces.light, TEXT_CONTRAST)
  const darkFg = readableShade(accent, WHITE, surfaces.dark, TEXT_CONTRAST)

  const onAccent =
    contrast(labels.light, accent) >= TEXT_CONTRAST || contrast(labels.light, accent) >= contrast(labels.dark, accent)
      ? labels.light
      : labels.dark

  return {
    light: {
      accent,
      accentStrong,
      accentShade,
      accentBright,
      accentDeep,
      accentFg: lightFg,
      onAccent,
      // A pale accent would vanish as a focus ring on white.
      focus: minContrast(accent, surfaces.light) >= MARK_CONTRAST ? accent : lightFg,
    },
    dark: {
      accentFg: darkFg,
      focus: darkFg,
    },
  }
}

const TOKEN_NAMES: Record<keyof AccentTokens, string> = {
  accent: '--color-accent',
  accentStrong: '--color-accent-strong',
  accentShade: '--color-accent-shade',
  accentBright: '--color-accent-bright',
  accentDeep: '--color-accent-deep',
  accentFg: '--color-accent-fg',
  onAccent: '--color-on-accent',
  focus: '--color-focus',
}

function declarations(tokens: Partial<AccentTokens>): string {
  return (Object.keys(tokens) as Array<keyof AccentTokens>)
    .map((key) => `  ${TOKEN_NAMES[key]}: ${(tokens[key] as Rgb).join(' ')};`)
    .join('\n')
}

/**
 * The palette as a stylesheet. The doubled ``:root`` outranks the plain
 * ``:root`` and ``[data-theme="dark"]`` blocks of tokens.css whatever the
 * order of the stylesheets, and the dark block outranks the light one.
 */
export function accentPaletteCss(palette: AccentPalette): string {
  return [
    `:root:root {\n${declarations(palette.light)}\n}`,
    `:root:root[data-theme="dark"] {\n${declarations(palette.dark)}\n}`,
  ].join('\n')
}
