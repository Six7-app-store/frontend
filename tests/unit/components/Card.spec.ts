import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import Card from '@/components/ui/Card.vue'

describe('Card', () => {
  it('rendert den Inhalt im Panel ohne Kopfzeile', () => {
    const wrapper = mount(Card, { slots: { default: '<p class="body">Inhalt</p>' } })

    expect(wrapper.classes()).toContain('surface-panel')
    expect(wrapper.find('.panel-head').exists()).toBe(false)
    expect(wrapper.find('.body').exists()).toBe(true)
  })

  it('zeigt Titel und Aktionen in der Kopfzeile', () => {
    const wrapper = mount(Card, {
      props: { title: 'Mitglieder' },
      slots: { default: 'x', actions: '<button class="add">Hinzufügen</button>' },
    })

    expect(wrapper.get('h2').text()).toBe('Mitglieder')
    expect(wrapper.get('.panel-head .add').text()).toBe('Hinzufügen')
  })

  it('erlaubt eine eigene Kopfzeile über den header-Slot', () => {
    const wrapper = mount(Card, { slots: { default: 'x', header: '<h3 class="own">Eigen</h3>' } })

    expect(wrapper.find('.panel-head .own').exists()).toBe(true)
    expect(wrapper.find('h2').exists()).toBe(false)
  })

  it('lässt mit flush das Innenpadding weg', () => {
    const padded = mount(Card, { slots: { default: 'x' } })
    const flush = mount(Card, { props: { flush: true }, slots: { default: 'x' } })

    expect(padded.get('div').classes()).toContain('p-panel')
    expect(flush.get('div').classes()).not.toContain('p-panel')
  })
})
