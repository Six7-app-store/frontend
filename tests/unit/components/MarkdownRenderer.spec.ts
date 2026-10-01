/**
 * The component's own share: sanitising, variants and clamping. The
 * Markdown rules themselves are tested on ``renderMarkdown``
 * (src/services/__tests__/markdown.service.test.ts).
 *
 * DOMPurify is replaced by a spy: under happy-dom it unwraps elements and
 * keeps event handlers, so its real output is only meaningful in a browser.
 * What is checked here is that every render goes through it, with the
 * configuration the component relies on.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import de from '@/i18n/locales/de'

const sanitize = vi.hoisted(() => vi.fn((html: string, _config?: unknown) => html))
vi.mock('dompurify', () => ({ default: { sanitize } }))

import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

function render(source: string, props: Record<string, unknown> = {}) {
  return mount(MarkdownRenderer, {
    props: { source, ...props },
    global: { plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })] },
  })
}

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    sanitize.mockClear()
    sanitize.mockImplementation((html: string) => html)
  })

  it('schickt jedes Rendering durch DOMPurify und zeigt nur dessen Ergebnis', () => {
    sanitize.mockReturnValue('<p>bereinigt</p>')

    const wrapper = render('<img src=x onerror="alert(1)"> Text')

    expect(sanitize).toHaveBeenCalledTimes(1)
    expect(sanitize.mock.calls[0]![0]).toContain('onerror')
    expect(sanitize.mock.calls[0]![1]).toEqual({ USE_PROFILES: { html: true }, ADD_ATTR: ['target', 'rel'] })
    expect(wrapper.html()).toContain('bereinigt')
    expect(wrapper.html()).not.toContain('onerror')
  })

  it('zeigt in der vollen Variante Überschriften mit Anker-IDs im prose-Stil', () => {
    const wrapper = render('# Titel\n\n## Abschnitt\n\nText mit `code`')

    expect(wrapper.get('.prose h2').attributes('id')).toBe('md-abschnitt')
    expect(wrapper.get('code').text()).toBe('code')
  })

  it('macht Überschriften in der kompakten Variante zu Fettdruck ohne IDs', () => {
    const wrapper = render('# Titel\n\nText', { variant: 'compact' })

    expect(wrapper.find('.md-compact').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.get('strong').text()).toBe('Titel')
    expect(wrapper.find('[id]').exists()).toBe(false)
  })

  it('kürzt nur mit clamp (happy-dom kennt line-clamp nicht, daher über overflow geprüft)', () => {
    const content = (props: Record<string, unknown>) => render('Langer Text', props).get('.prose')

    expect(content({ clamp: 2 }).attributes('style')).toContain('overflow: hidden')
    expect(content({}).attributes('style')).toBeUndefined()
  })

  it('rendert für leere Quellen nichts und ruft DOMPurify nicht auf', () => {
    expect(render('   ').html()).toBe('<!--v-if-->')
    expect(sanitize).not.toHaveBeenCalled()
  })
})
