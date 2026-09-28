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

    expect(wrapper.classes()).toContain(cls)
  })

  it('ist ohne Angaben primary in mittlerer Größe', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Text' } })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['btn-primary', 'px-5', 'py-2.5']))
  })

  it('rendert size="sm" kompakter', () => {
    const wrapper = mount(BaseButton, { props: { size: 'sm' }, slots: { default: 'Text' } })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['px-4', 'py-2']))
    expect(wrapper.classes()).not.toContain('px-5')
  })

  it('reicht disabled an das button-Element durch', () => {
    const wrapper = mount(BaseButton, { attrs: { disabled: true }, slots: { default: 'Text' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
