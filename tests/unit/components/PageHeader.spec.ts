import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import PageHeader from '@/components/ui/PageHeader.vue'

describe('PageHeader', () => {
  it('zeigt Titel als h1 und optional den Untertitel', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Apps', subtitle: 'Alle Anwendungen' } })

    expect(wrapper.get('h1').text()).toBe('Apps')
    expect(wrapper.text()).toContain('Alle Anwendungen')
  })

  it('lässt ohne Untertitel und Aktionen nichts Leeres stehen', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Apps' } })

    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.findAll('div')).toHaveLength(2)
  })

  it('setzt die Hauptaktion in den actions-Slot rechts', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Apps' },
      slots: { actions: '<button class="main">Neue App</button>' },
    })

    expect(wrapper.get('.main').text()).toBe('Neue App')
  })

  it.each([
    ['page', 'text-4xl'],
    ['detail', 'text-5xl'],
    ['greeting', 'text-3xl'],
  ] as const)('wählt für size=%s die Titelgröße %s', (size, cls) => {
    const wrapper = mount(PageHeader, { props: { title: 'Titel', size } })

    expect(wrapper.get('h1').classes()).toContain(cls)
  })
})
