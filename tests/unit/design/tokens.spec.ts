/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Guards the design-token contract: light and dark differ only through
 * tokens.css, text stays readable in both themes, and no colour literal lives
 * anywhere else in src/. Files are read with fs because vitest blanks CSS
 * imports, `?raw` included.
 */

const SRC = resolve(__dirname, '../../../src')
const TOKENS_FILE = join(SRC, 'styles', 'tokens.css')

type Tokens = Record<string, string>
type Rgb = [number, number, number]

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`selector ${selector} not found`)
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
}

function declarations(body: string): Tokens {
  const result: Tokens = {}
  for (const match of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    result[match[1] as string] = (match[2] as string).trim()
  }
  return result
}

const tokensCss = readFileSync(TOKENS_FILE, 'utf-8')
const light = declarations(block(tokensCss, ':root'))
const darkOverrides = declarations(block(tokensCss, '[data-theme="dark"]'))
const dark: Tokens = { ...light, ...darkOverrides }

function triplet(tokens: Tokens, name: string): Rgb {
  const parts = tokens[`--color-${name}`]?.split(/\s+/).map(Number) ?? []
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`--color-${name} is not an RGB triplet`)
  }
  return parts as Rgb
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// Text tokens that must be readable on the page surfaces.
const TEXT = ['fg', 'fg-body', 'fg-muted', 'fg-subtle', 'nav', 'heading', 'accent-fg', 'success', 'warning', 'danger', 'neutral']
const SURFACES = ['surface', 'canvas']

// Darkest glass tone the nav text can sit on (end of the sidebar gradient).
const SIDEBAR_GLASS: Record<'light' | 'dark', Rgb> = { light: [233, 238, 244], dark: [34, 29, 32] }

const THEMES = [['light', light], ['dark', dark]] as const

describe('design tokens', () => {
  it('dark only overrides names that light defines', () => {
    const unknown = Object.keys(darkOverrides).filter((name) => !(name in light))
    expect(unknown).toEqual([])
  })

  it('keeps sizes, radii and layout measures theme-independent', () => {
    const layout = /^--(?:(?:text|leading|radius|font|sidebar|topbar|aside|page|detail|narrow|reading|lead|toc|content|section|card)-|panel-pad$|control-h(?:-sm|-lg|-icon)?$)/
    expect(Object.keys(darkOverrides).filter((name) => layout.test(name))).toEqual([])
  })

  it.each(THEMES)('text stays at 4.5:1 on its surfaces in %s', (theme, tokens) => {
    const failures: string[] = []
    const backgrounds: Array<[string, Rgb]> = SURFACES.map((s) => [s, triplet(tokens, s)])
    backgrounds.push(['sidebar glass', SIDEBAR_GLASS[theme]])
    for (const text of TEXT) {
      for (const [name, bg] of backgrounds) {
        const ratio = contrast(triplet(tokens, text), bg)
        if (ratio < 4.5) failures.push(`${text} on ${name}: ${ratio.toFixed(2)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it.each(THEMES)('label text on the accent and tooltip fills reads in %s', (_theme, tokens) => {
    expect(contrast(triplet(tokens, 'on-accent'), triplet(tokens, 'accent'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(triplet(tokens, 'on-tooltip'), triplet(tokens, 'tooltip'))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('colour literals', () => {
  const sources = readdirSync(SRC, { recursive: true, encoding: 'utf-8' })
    .map((entry) => join(SRC, entry))
    .filter((file) => /\.(vue|ts|css)$/.test(file))
    .filter((file) => file !== TOKENS_FILE)
    .filter((file) => !file.includes(`${sep}__tests__${sep}`) && !/\.(test|spec)\.ts$/.test(file))

  it('finds the sources it is supposed to scan', () => {
    expect(sources.length).toBeGreaterThan(50)
  })

  it('lives only in tokens.css', () => {
    const offenders: string[] = []
    for (const file of sources) {
      const source = readFileSync(file, 'utf-8')
      const hex = source.match(/#[0-9a-fA-F]{3,8}\b/g)
      const functional = source.match(/\b(?:rgba?|hsla?)\(\s*(?!var\()/g)
      if (hex) offenders.push(`${relative(SRC, file)}: ${hex.join(', ')}`)
      if (functional) offenders.push(`${relative(SRC, file)}: ${functional.join(', ')}`)
    }
    expect(offenders).toEqual([])
  })
})
