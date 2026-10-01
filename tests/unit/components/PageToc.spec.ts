import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import PageToc from '@/components/ui/PageToc.vue'
import de from '@/i18n/locales/de'
import en from '@/i18n/locales/en'

const items = [
  { id: 'beschreibung', label: 'Beschreibung' },
  { id: 'version', label: 'Version' },
]

const mountToc = (locale: 'de' | 'en' = 'de') =>
  mount(PageToc, {
    props: { items },
    global: { plugins: [createI18n({ legacy: false, locale, messages: { de, en } })] },
  })

describe('PageToc', () => {
  it('verlinkt die Abschnitte als Anker', () => {
    const links = mountToc().findAll('a')

    expect(links.map((a) => a.attributes('href'))).toEqual(['#beschreibung', '#version'])
    expect(links.map((a) => a.text())).toEqual(['Beschreibung', 'Version'])
  })

  it('heißt auf Deutsch „Auf dieser Seite“ und auf Englisch „On this page“', () => {
    expect(mountToc('de').get('nav').attributes('aria-label')).toBe('Auf dieser Seite')
    expect(mountToc('en').get('nav').attributes('aria-label')).toBe('On this page')
    expect(mountToc('en').text()).toContain('On this page')
  })
})
