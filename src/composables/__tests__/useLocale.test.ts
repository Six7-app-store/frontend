import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import { useLocale } from '@/composables/useLocale'
import { LOCALE_STORAGE_KEY } from '@/utils/storage-keys'

function setup(initial: string = 'de') {
  const i18n = createI18n({ legacy: false, locale: initial, messages: { de: {}, en: {} } })
  let result!: ReturnType<typeof useLocale>
  mount(
    defineComponent({
      setup() {
        result = useLocale()
        return () => h('div')
      },
    }),
    { global: { plugins: [i18n] } },
  )
  return { i18n, ...result }
}

describe('useLocale', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('liefert die aktive Sprache', () => {
    expect(setup('en').locale.value).toBe('en')
    expect(setup('de').locale.value).toBe('de')
  })

  it('fällt bei unbekannter Sprache auf Deutsch zurück', () => {
    expect(setup('fr').locale.value).toBe('de')
  })

  it('wechselt die Sprache und merkt sie sich im Browser', () => {
    const { i18n, locale } = setup('de')

    locale.value = 'en'

    expect(i18n.global.locale.value).toBe('en')
    expect(locale.value).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('wechselt auch dann, wenn der Speicher nicht verfügbar ist', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { i18n, locale } = setup('de')

    expect(() => {
      locale.value = 'en'
    }).not.toThrow()
    expect(i18n.global.locale.value).toBe('en')
  })
})
