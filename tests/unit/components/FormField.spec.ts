import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import FormField from '@/components/ui/FormField.vue'

const slot = `<template #default="{ id, describedBy, invalid }">
  <input :id="id" :aria-describedby="describedBy" :aria-invalid="invalid" />
</template>`

describe('FormField', () => {
  it('verbindet das Label mit dem Feld im Slot', () => {
    const wrapper = mount(FormField, { props: { label: 'Name' }, slots: { default: slot } })
    const input = wrapper.get('input')

    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(wrapper.get('label').text()).toBe('Name')
  })

  it('markiert Pflichtfelder optisch, nicht für Screenreader', () => {
    const wrapper = mount(FormField, { props: { label: 'Name', required: true }, slots: { default: slot } })

    expect(wrapper.get('label span').attributes('aria-hidden')).toBe('true')
  })

  it('hängt Hinweis und Fehler per aria-describedby an das Feld', () => {
    const wrapper = mount(FormField, {
      props: { label: 'Name', hint: 'Mindestens drei Zeichen', error: 'Zu kurz' },
      slots: { default: slot },
    })
    const input = wrapper.get('input')
    const described = input.attributes('aria-describedby')?.split(' ') ?? []

    expect(described).toHaveLength(2)
    expect(wrapper.get(`[id="${described[0]}"]`).text()).toBe('Mindestens drei Zeichen')
    expect(wrapper.get(`[id="${described[1]}"]`).text()).toBe('Zu kurz')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('[role="alert"]').text()).toBe('Zu kurz')
  })

  it('setzt ohne Hinweis und Fehler weder describedby noch invalid', () => {
    const wrapper = mount(FormField, { props: { label: 'Name' }, slots: { default: slot } })
    const input = wrapper.get('input')

    expect(input.attributes('aria-describedby')).toBeUndefined()
    expect(input.attributes('aria-invalid')).toBe('false')
  })
})
