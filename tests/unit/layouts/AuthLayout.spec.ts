/**
 * The frame outside the app shell: brand hero, the page in the panel, and
 * language and theme switchable before anyone is signed in.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import de from '@/i18n/locales/de'
import en from '@/i18n/locales/en'

// useTheme keeps a module-level singleton; load a fresh copy per test.
async function mountLayout() {
  vi.resetModules()
  const { default: AuthLayout } = await import('@/layouts/AuthLayout.vue')
  const i18n = createI18n({ legacy: false, locale: 'de', messages: { de, en } })
  const wrapper = mount(AuthLayout, {
    global: { plugins: [i18n] },
    slots: { default: '<h1 class="page-title">Anmelden</h1>' },
  })
  return { wrapper, i18n }
}

describe('AuthLayout', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    localStorage.clear()
  })

  it('zeigt die Seite im Panel und hält den Hero vor Screenreadern verborgen', async () => {
    const { wrapper } = await mountLayout()

    expect(wrapper.get('.login-panel .page-title').text()).toBe('Anmelden')
    expect(wrapper.get('.login-hero').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.login-hero').text()).toContain("Click'n Deploy")
  })

  it('bietet Sprache und Theme schon vor der Anmeldung an', async () => {
    const { wrapper, i18n } = await mountLayout()

    const en_ = wrapper.findAll('[aria-pressed]').find((b) => b.text() === 'EN')!
    await en_.trigger('click')
    expect(i18n.global.locale.value).toBe('en')

    await wrapper.get(`button[aria-label="${en.theme.toDark}"]`).trigger('click')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('wechselt das Logo mit dem Theme', async () => {
    const { wrapper } = await mountLayout()
    const src = () => wrapper.get('.login-hero img').attributes('src')

    const light = src()
    await wrapper.get(`button[aria-label="${de.theme.toDark}"]`).trigger('click')

    expect(src()).not.toBe(light)
    expect(src()).toContain('dark')
  })
})
