import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import ReasonModal from '@/components/ui/ReasonModal.vue'
import de from '@/i18n/locales/de'

const mountModal = (props: Record<string, unknown> = {}) => mount(ReasonModal, {
  props: {
    show: true,
    title: 'Ablehnen',
    label: 'Begründung',
    confirmLabel: 'Ablehnen',
    modelValue: '',
    'onUpdate:modelValue': (v: string) => wrapper.setProps({ modelValue: v }),
    ...props,
  },
  slots: {
    default: '<p class="context">v1.0.0</p>',
    after: '<p class="errors">Marker-Fehler</p>',
  },
  global: { plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })] },
})
let wrapper: ReturnType<typeof mountModal>

const confirmButton = () => wrapper.findAll('.modal-footer button')[1]!

describe('ReasonModal', () => {
  it('zeigt Kontext, Beschriftung, Textfeld und den Slot darunter', () => {
    wrapper = mountModal()
    expect(wrapper.find('.context').exists()).toBe(true)
    expect(wrapper.text()).toContain('Begründung')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('.errors').exists()).toBe(true)
  })

  it('sperrt Bestätigen bei Pflichtfeld, solange nur Leerzeichen drinstehen', async () => {
    wrapper = mountModal({ required: true })
    expect(confirmButton().attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('   ')
    expect(confirmButton().attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue(' Grund ')
    expect(confirmButton().attributes('disabled')).toBeUndefined()
    expect(wrapper.props('modelValue')).toBe(' Grund ')
  })

  it('lässt ohne Pflichtfeld auch leer bestätigen', async () => {
    wrapper = mountModal()
    await confirmButton().trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})
