import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'

describe('ToggleSwitch', () => {
  it('meldet den Zustand als Schalter und schaltet per Klick um', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, label: 'Öffentlich' } })
    const button = wrapper.find('button')

    expect(button.attributes('role')).toBe('switch')
    expect(button.attributes('aria-checked')).toBe('false')
    expect(button.attributes('aria-label')).toBe('Öffentlich')
    expect(button.classes()).toContain('toggle-off')

    await button.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])

    await wrapper.setProps({ modelValue: true })
    expect(button.attributes('aria-checked')).toBe('true')
    expect(button.classes()).toContain('toggle-on')
  })

  it('hat eine kompakte Größe', () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, label: 'Filter', size: 'sm' } })
    expect(wrapper.find('button').classes()).toContain('h-5')
  })

  it('reagiert deaktiviert nicht auf Klicks', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, label: 'x', disabled: true } })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
