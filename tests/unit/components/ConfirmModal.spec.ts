import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import de from '@/i18n/locales/de'

const mountModal = (props: Record<string, unknown> = {}) => mount(ConfirmModal, {
  props: { show: true, title: 'Wirklich?', confirmLabel: 'Löschen', ...props },
  slots: { default: '<p class="body">Text</p>' },
  global: { plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })] },
})

const buttons = (wrapper: ReturnType<typeof mountModal>) => {
  const all = wrapper.findAll('.modal-footer button')
  return { cancel: all[0]!, confirm: all[1]! }
}

describe('ConfirmModal', () => {
  it('rendert Titel, Inhalt und die beiden Buttons', () => {
    const wrapper = mountModal()
    const { cancel, confirm } = buttons(wrapper)

    expect(wrapper.text()).toContain('Wirklich?')
    expect(wrapper.find('.body').exists()).toBe(true)
    expect(cancel.text()).toBe('Abbrechen')
    expect(confirm.text()).toBe('Löschen')
    expect(confirm.classes()).toContain('btn-danger')
  })

  it('rendert nichts, solange show false ist', () => {
    expect(mountModal({ show: false }).find('.body').exists()).toBe(false)
  })

  it('emittiert confirm und close', async () => {
    const wrapper = mountModal()
    const { cancel, confirm } = buttons(wrapper)

    await confirm.trigger('click')
    await cancel.trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('sperrt während busy beide Buttons, zeigt den Busy-Text und lässt sich nicht schließen', async () => {
    const wrapper = mountModal({ busy: true, busyLabel: 'Lösche…' })
    const { cancel, confirm } = buttons(wrapper)

    expect(confirm.text()).toBe('Lösche…')
    expect(confirm.attributes('disabled')).toBeDefined()
    expect(cancel.attributes('disabled')).toBeDefined()

    await wrapper.find(`button[aria-label="${de.common.close}"]`).trigger('click')
    await wrapper.find('.scrim').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('übernimmt Variante und eigenen Abbrechen-Text', () => {
    const { cancel, confirm } = buttons(mountModal({ variant: 'secondary', cancelLabel: 'Nein' }))

    expect(confirm.classes()).toContain('btn-secondary')
    expect(cancel.text()).toBe('Nein')
  })
})
