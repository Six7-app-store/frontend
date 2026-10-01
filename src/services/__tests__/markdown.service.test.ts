import { describe, it, expect } from 'vitest'
import { marked } from 'marked'

import { headingId, markdownHeadings, plainText, renderMarkdown } from '@/services/markdown.service'

describe('plainText', () => {
  it('lässt von Hervorhebung, Code und Links nur den Text übrig', () => {
    const [paragraph] = marked.lexer('Mit **fett**, `code` und [Link](https://x.test).') as any[]

    expect(plainText(paragraph.tokens)).toBe('Mit fett, code und Link.')
  })

  it('nimmt ohne Tokens den Ersatztext', () => {
    expect(plainText(undefined, 'roh')).toBe('roh')
  })
})

describe('headingId', () => {
  it('macht aus der Überschrift eine lesbare, präfixierte ID', () => {
    expect(headingId('User-Management & Zugänge', new Map())).toBe('md-user-management-zugaenge')
  })

  it('zählt doppelte Überschriften hoch', () => {
    const seen = new Map<string, number>()

    expect([headingId('Details', seen), headingId('Details', seen), headingId('Details', seen)]).toEqual([
      'md-details', 'md-details-2', 'md-details-3',
    ])
  })

  it('hat auch für Überschriften ohne Buchstaben eine ID', () => {
    expect(headingId('!!!', new Map())).toBe('md-section')
  })
})

describe('markdownHeadings', () => {
  it('listet alle Überschriften in Reihenfolge mit Ebene und ID', () => {
    const md = ['# Online-IDE', '', 'Text', '', '## VM-Deployment', '', '### Größe', '', '## VM-Deployment'].join('\n')

    expect(markdownHeadings(md)).toEqual([
      { id: 'md-online-ide', text: 'Online-IDE', depth: 1 },
      { id: 'md-vm-deployment', text: 'VM-Deployment', depth: 2 },
      { id: 'md-groesse', text: 'Größe', depth: 3 },
      { id: 'md-vm-deployment-2', text: 'VM-Deployment', depth: 2 },
    ])
  })

  it('liefert für leere Texte keine Überschriften', () => {
    expect(markdownHeadings(null)).toEqual([])
  })
})

describe('renderMarkdown', () => {
  it('bricht nicht an einzelnen Zeilenumbrüchen um, nur an Leerzeilen', () => {
    const html = renderMarkdown('erste Zeile\nzweite Zeile\n\nneuer Absatz')

    expect(html).not.toContain('<br')
    expect(html.match(/<p>/g)).toHaveLength(2)
  })

  it('setzt Inline-Code als code-Element, ohne Backticks', () => {
    const html = renderMarkdown('Flavor `gp1.small` wählen')

    expect(html).toContain('<code>gp1.small</code>')
    expect(html).not.toContain('`')
  })

  it('behält die Überschriften-Ebenen und vergibt dieselben IDs wie markdownHeadings', () => {
    const md = '# Titel\n\n## User-Management\n\n### Größe\n\n## User-Management'
    const html = renderMarkdown(md)

    for (const heading of markdownHeadings(md)) {
      expect(html).toContain(`<h${heading.depth} id="${heading.id}">${heading.text}</h${heading.depth}>`)
    }
  })

  it('rendert Tabellen als echte Tabellen', () => {
    const html = renderMarkdown('| Phase | Dauer |\n|---|---:|\n| Build | 5 Min |')

    expect(html).toContain('<table>')
    expect(html).toContain('<th>Phase</th>')
    expect(html).toContain('<td align="right">5 Min</td>')
  })

  it('macht in der kompakten Variante Überschriften fett und Codeblöcke inline', () => {
    const html = renderMarkdown('# Titel <b>\n\n```\nnpm i\n```\n\n---', 'compact')

    expect(html).toContain('<strong>Titel &lt;b&gt;</strong>')
    expect(html).toContain('<code>npm i</code>')
    expect(html).not.toContain('<h1')
    expect(html).not.toContain('<pre')
    expect(html).not.toContain('<hr')
  })

  it('liefert für leere Quellen einen leeren Text', () => {
    expect(renderMarkdown(null)).toBe('')
    expect(renderMarkdown('  \n ')).toBe('')
  })
})
