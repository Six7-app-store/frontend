import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import AlertBox from '@/components/ui/AlertBox.vue'

const LockIcon = { name: 'LockIcon', template: '<svg class="lock-icon" />' }

describe('AlertBox', () => {
  it('ist ohne Angabe eine Warnung und zeigt Titel, Text und Aktion', () => {
    const wrapper = mount(AlertBox, {
      props: { title: 'Credentials fehlen' },
      slots: { default: 'Hinterlege sie im Profil.', actions: '<button class="cta">Jetzt einrichten</button>' },
    })

    expect(wrapper.classes()).toContain('alert-warning')
    expect(wrapper.text()).toContain('Credentials fehlen')
    expect(wrapper.text()).toContain('Hinterlege sie im Profil.')
    expect(wrapper.find('.cta').exists()).toBe(true)
  })

  it.each(['warning', 'info', 'danger', 'success'] as const)('rendert den Ton %s', (tone) => {
    const wrapper = mount(AlertBox, { props: { tone }, slots: { default: 'Text' } })

    expect(wrapper.classes()).toContain(`alert-${tone}`)
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('meldet nur Fehler als alert an Screenreader', () => {
    expect(mount(AlertBox, { props: { tone: 'danger' } }).attributes('role')).toBe('alert')
    expect(mount(AlertBox, { props: { tone: 'info' } }).attributes('role')).toBeUndefined()
  })

  it('nimmt ein eigenes Icon statt des Ton-Icons', () => {
    const wrapper = mount(AlertBox, { props: { tone: 'info', icon: LockIcon } })

    expect(wrapper.find('.lock-icon').exists()).toBe(true)
    expect(wrapper.findAll('svg')).toHaveLength(1)
  })
})
