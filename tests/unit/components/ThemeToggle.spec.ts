import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import de from '@/i18n/locales/de'
import en from '@/i18n/locales/en'

// useTheme keeps a module-level singleton; load a fresh copy per test.
async function mountToggle(locale: 'de' | 'en' = 'de') {
  vi.resetModules()
  const { default: ThemeToggle } = await import('@/components/ui/ThemeToggle.vue')
  return mount(ThemeToggle, {
    global: { plugins: [createI18n({ legacy: false, locale, messages: { de, en } })] },
  })
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    localStorage.clear()
  })

  it('is a real button, labelled via i18n, not pressed by default', async () => {
    const wrapper = await mountToggle()
    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe(de.theme.dark)
    expect(button.attributes('aria-pressed')).toBe('false')
  })

  it('uses the English label when the locale is en', async () => {
    const wrapper = await mountToggle('en')
    expect(wrapper.get('button').attributes('aria-label')).toBe(en.theme.dark)
  })

  it('switches to dark and back on click', async () => {
    const wrapper = await mountToggle()
    const button = wrapper.get('button')

    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
