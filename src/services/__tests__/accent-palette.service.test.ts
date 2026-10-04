/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BLACK,
  WHITE,
  accentPaletteCss,
  contrast,
  deriveAccentPalette,
  hexToRgb,
  isAccentHex,
  normalizeAccentHex,
  parseTriplet,
  rgbToHex,
  type Rgb,
  type ThemeSurfaces,
} from '../accent-palette.service'
import { parseTokenSheet } from '@/utils/design-tokens'

// vitest blanks CSS imports, so the real token values are read from disk —
// the derivation is checked against the surfaces it will meet in the app.
const tokens = parseTokenSheet(readFileSync(resolve(__dirname, '../../styles/tokens.css'), 'utf-8'))
const triplet = (theme: 'light' | 'dark', name: string) => parseTriplet(tokens[theme][`--color-${name}`] ?? '') as Rgb

const surfaces: ThemeSurfaces = {
  light: [triplet('light', 'surface'), triplet('light', 'canvas')],
  dark: [triplet('dark', 'surface'), triplet('dark', 'canvas')],
}
const labels = { light: triplet('light', 'on-accent'), dark: BLACK }

const near = (actual: Rgb, expected: Rgb, tolerance: number) =>
  actual.every((v, i) => Math.abs(v - (expected[i] as number)) <= tolerance)

describe('hex helpers', () => {
  it.each([
    ['#1a73e8', [26, 115, 232]],
    ['1A73E8', [26, 115, 232]],
    [' #FFFFFF ', [255, 255, 255]],
  ])('reads %s', (hex, rgb) => {
    expect(hexToRgb(hex)).toEqual(rgb)
    expect(isAccentHex(hex)).toBe(true)
  })

  it.each(['', '#fff', '#12345', '#1234567', '#GGGGGG', 'red'])('refuses %j', (hex) => {
    expect(hexToRgb(hex)).toBeNull()
    expect(isAccentHex(hex)).toBe(false)
    expect(normalizeAccentHex(hex)).toBeNull()
  })

  it('normalises to the uppercase #RRGGBB the backend stores', () => {
    expect(normalizeAccentHex('1a73e8')).toBe(rgbToHex([26, 115, 232]))
    expect(rgbToHex([26, 115, 232])).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('parses token triplets and rejects anything else', () => {
    expect(parseTriplet('226 0 26')).toEqual([226, 0, 26])
    expect(parseTriplet('226 0')).toBeNull()
    expect(parseTriplet('256 0 0')).toBeNull()
    expect(parseTriplet('var(--x)')).toBeNull()
  })
})

describe('deriveAccentPalette', () => {
  it('reproduces the built-in shades from the built-in accent', () => {
    const palette = deriveAccentPalette(triplet('light', 'accent'), surfaces, labels)

    expect(near(palette.light.accentShade, triplet('light', 'accent-shade'), 2)).toBe(true)
    expect(near(palette.light.accentDeep, triplet('light', 'accent-deep'), 2)).toBe(true)
    expect(palette.light.onAccent).toEqual(triplet('light', 'on-accent'))
  })

  // From pale to dark, saturated to grey: whatever an admin picks, text in
  // the accent and labels on it stay readable, and the focus ring visible.
  const PICKS: Rgb[] = [
    [226, 0, 26],
    [26, 115, 232],
    [255, 235, 59],
    [0, 200, 83],
    [128, 128, 128],
    [255, 255, 255],
    [0, 0, 0],
    [118, 75, 162],
    [255, 152, 0],
    [0, 188, 212],
  ]

  it.each(PICKS.map((rgb) => [rgbToHex(rgb), rgb] as const))('keeps %s readable in both themes', (_hex, accent) => {
    const palette = deriveAccentPalette(accent, surfaces, labels)

    for (const bg of surfaces.light) {
      expect(contrast(palette.light.accentFg, bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(palette.light.focus, bg)).toBeGreaterThanOrEqual(3)
    }
    for (const bg of surfaces.dark) {
      expect(contrast(palette.dark.accentFg, bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(palette.dark.focus, bg)).toBeGreaterThanOrEqual(3)
    }
    expect(contrast(palette.light.onAccent, accent)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps an accent that is already readable as its own text colour', () => {
    const blue: Rgb = [26, 115, 232]
    expect(deriveAccentPalette(blue, surfaces, labels).light.focus).toEqual(blue)
  })

  it('labels a pale accent in black and a dark one in white', () => {
    expect(deriveAccentPalette([255, 235, 59], surfaces, labels).light.onAccent).toEqual(BLACK)
    expect(deriveAccentPalette([20, 40, 120], surfaces, labels).light.onAccent).toEqual(labels.light)
  })

  it('keeps the hue when shading', () => {
    const { light } = deriveAccentPalette([26, 115, 232], surfaces, labels)
    const ratio = (rgb: Rgb) => (rgb[2] as number) / Math.max(1, rgb[0] as number)
    expect(ratio(light.accentShade)).toBeCloseTo(ratio([26, 115, 232]), 0)
    expect(light.accentBright.every((v, i) => v >= ([26, 115, 232][i] as number))).toBe(true)
    expect(light.accentBright.every((v, i) => v <= (WHITE[i] as number))).toBe(true)
  })
})

describe('accentPaletteCss', () => {
  it('overrides every accent token, and the dark ones under the dark theme', () => {
    const css = accentPaletteCss(deriveAccentPalette([26, 115, 232], surfaces, labels))

    expect(css).toContain(':root:root {')
    expect(css).toContain('--color-accent: 26 115 232;')
    for (const name of ['accent-strong', 'accent-shade', 'accent-bright', 'accent-deep', 'accent-fg', 'on-accent', 'focus']) {
      expect(css).toContain(`--color-${name}:`)
    }
    const dark = css.slice(css.indexOf(':root:root[data-theme="dark"]'))
    expect(dark).toContain('--color-accent-fg:')
    expect(dark).toContain('--color-focus:')
    expect(dark).not.toContain('--color-accent:')
  })

  it('only names tokens tokens.css defines', () => {
    const css = accentPaletteCss(deriveAccentPalette([26, 115, 232], surfaces, labels))
    const names = [...css.matchAll(/(--[\w-]+):/g)].map((m) => m[1] as string)
    expect(names.filter((name) => !(name in tokens.light))).toEqual([])
  })
})
