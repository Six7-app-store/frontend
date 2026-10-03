/**
 * Read access to the colour triplets in ``styles/tokens.css`` from code.
 *
 * The accent derivation needs the surfaces of *both* themes at once, and the
 * built-in accent as the colour picker's default — values the computed style
 * of the page cannot give (it only knows the active theme, and an admin's
 * accent overrides the default). Parsing the stylesheet's source keeps
 * tokens.css the only place that holds them.
 */
import tokensCss from '@/styles/tokens.css?raw'
import { parseTriplet, type Rgb } from '@/services/accent-palette.service'

export type TokenTheme = 'light' | 'dark'

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return ''
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
}

function declarations(body: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const match of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    result[match[1] as string] = (match[2] as string).trim()
  }
  return result
}

/** Parsed once; empty when the stylesheet is unavailable (vitest blanks CSS imports). */
export function parseTokenSheet(css: string): Record<TokenTheme, Record<string, string>> {
  const light = declarations(block(css, ':root'))
  return { light, dark: { ...light, ...declarations(block(css, '[data-theme="dark"]')) } }
}

const sheet = parseTokenSheet(typeof tokensCss === 'string' ? tokensCss : '')

/** ``--color-<name>`` in ``theme`` as built in, or ``null`` when it is not a triplet. */
export function tokenTriplet(theme: TokenTheme, name: string): Rgb | null {
  const value = sheet[theme][`--color-${name}`]
  return value ? parseTriplet(value) : null
}
