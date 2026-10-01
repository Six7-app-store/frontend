/**
 * Rules for rendered Markdown that the renderer and the page around it
 * share: plain text of inline tokens and the anchor ids of headings, so a
 * table of contents links to exactly the ids the renderer writes.
 */
import { marked, Renderer, type Token, type Tokens } from 'marked'

/** Inline tokens reduced to their text: links keep their label, emphasis and code lose the markers. */
export function plainText(tokens: Token[] | undefined, fallback = ''): string {
  if (!tokens) return fallback
  return tokens
    .map((token) => ('tokens' in token && token.tokens ? plainText(token.tokens) : 'text' in token ? token.text : ''))
    .join('')
}

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }

/**
 * Anchor id for a heading. ``seen`` counts the ids handed out so far, so a
 * second "Details" becomes ``md-details-2``. The ``md-`` prefix keeps the
 * ids clear of the page's own ids and of names DOMPurify guards.
 */
export function headingId(text: string, seen: Map<string, number>): string {
  const base =
    'md-' +
    (text
      .toLowerCase()
      .replace(/[äöüß]/g, (ch) => UMLAUTS[ch] ?? ch)
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section')
  const count = (seen.get(base) ?? 0) + 1
  seen.set(base, count)
  return count === 1 ? base : `${base}-${count}`
}

export interface MarkdownHeading {
  id: string
  text: string
  depth: number
}

/** All headings of a Markdown text in order, with the ids the renderer gives them. */
export function markdownHeadings(markdown: string | null | undefined): MarkdownHeading[] {
  const seen = new Map<string, number>()
  const headings: MarkdownHeading[] = []
  marked.walkTokens(marked.lexer((markdown ?? '').trim()), (token) => {
    if (token.type !== 'heading') return
    const heading = token as Tokens.Heading
    const text = plainText(heading.tokens, heading.text)
    headings.push({ id: headingId(text, seen), text, depth: heading.depth })
  })
  return headings
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Markdown to HTML, not yet sanitised (MarkdownRenderer runs DOMPurify over it).
 *
 * ``full`` keeps the document structure and gives headings the ids of
 * ``markdownHeadings``. ``compact`` neutralises block-level constructs that
 * would blow up a card or table row: headings become bold, code blocks
 * inline code. A single line break is not a break in the text; a blank
 * line starts a new paragraph.
 */
export function renderMarkdown(markdown: string | null | undefined, variant: 'full' | 'compact' = 'full'): string {
  const raw = (markdown ?? '').trim()
  if (!raw) return ''
  const renderer = new Renderer()
  if (variant === 'full') {
    const seen = new Map<string, number>()
    renderer.heading = function ({ tokens, depth }) {
      const id = headingId(plainText(tokens), seen)
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`
    }
  } else {
    renderer.heading = ({ tokens }) => `<strong>${escapeHtml(plainText(tokens))}</strong> `
    renderer.code = ({ text }) => `<code>${escapeHtml(text)}</code> `
    renderer.hr = () => ' · '
  }
  return marked.parse(raw, { gfm: true, breaks: false, renderer, async: false }) as string
}
