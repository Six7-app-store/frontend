import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import NotFoundView from '@/views/NotFoundView.vue'
import de from '@/i18n/locales/de'

const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

describe('NotFoundView', () => {
  const mountView = () => mount(NotFoundView, {
    global: { plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })] },
  })

  it('zeigt Titel und Erklärung', () => {
    const wrapper = mountView()

    expect(wrapper.text()).toContain(de.NotFoundView.title)
    expect(wrapper.text()).toContain(de.NotFoundView.description)
  })

  it('führt zurück zum Dashboard', async () => {
    const wrapper = mountView()

    await wrapper.find('button').trigger('click')

    expect(mockReplace).toHaveBeenCalledWith({ name: 'dashboard' })
  })
})
