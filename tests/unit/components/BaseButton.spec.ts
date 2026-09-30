import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseButton from '@/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it.each([
    ['primary', 'btn-primary'],
    ['secondary', 'btn-secondary'],
    ['danger', 'btn-danger'],
    ['ghost', 'btn-ghost'],
  ] as const)('rendert die Variante %s mit %s', (variant, cls) => {
    const wrapper = mount(BaseButton, { props: { variant }, slots: { default: 'Text' } })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['btn', cls]))
  })

  it('ist ohne Angaben primary in mittlerer Größe', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Text' } })

    expect(wrapper.classes()).toContain('btn-primary')
    expect(wrapper.classes()).not.toContain('btn-sm')
    expect(wrapper.classes()).not.toContain('btn-lg')
  })

  it.each([
    ['sm', 'btn-sm'],
    ['lg', 'btn-lg'],
  ] as const)('rendert size="%s" mit %s', (size, cls) => {
    const wrapper = mount(BaseButton, { props: { size }, slots: { default: 'Text' } })

    expect(wrapper.classes()).toContain(cls)
  })

  it('rendert als Icon-Button mit zugänglichem Namen', () => {
    const wrapper = mount(BaseButton, { props: { icon: true, label: 'Kopieren', variant: 'ghost' }, slots: { default: '<svg />' } })

    expect(wrapper.classes()).toContain('btn-icon')
    expect(wrapper.attributes('aria-label')).toBe('Kopieren')
  })

  it('vergibt kein aria-label an normale Buttons', () => {
    const wrapper = mount(BaseButton, { props: { label: 'ignoriert' }, slots: { default: 'Text' } })

    expect(wrapper.attributes('aria-label')).toBeUndefined()
  })

  it('reicht disabled an das button-Element durch', () => {
    const wrapper = mount(BaseButton, { attrs: { disabled: true }, slots: { default: 'Text' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('nennt den Grund, solange der Button deaktiviert ist', () => {
    const wrapper = mount(BaseButton, {
      attrs: { disabled: true },
      props: { disabledReason: 'Erst Credentials hinterlegen' },
      slots: { default: 'Deployen' },
    })
    const reason = wrapper.get('.sr-only')

    expect(wrapper.attributes('title')).toBe('Erst Credentials hinterlegen')
    expect(reason.text()).toBe('Erst Credentials hinterlegen')
    expect(wrapper.attributes('aria-describedby')).toBe(reason.attributes('id'))
  })

  it('zeigt den Grund nicht, wenn der Button aktiv ist', () => {
    const wrapper = mount(BaseButton, {
      attrs: { disabled: false },
      props: { disabledReason: 'Erst Credentials hinterlegen' },
      slots: { default: 'Deployen' },
    })

    expect(wrapper.attributes('title')).toBeUndefined()
    expect(wrapper.find('.sr-only').exists()).toBe(false)
  })
})
