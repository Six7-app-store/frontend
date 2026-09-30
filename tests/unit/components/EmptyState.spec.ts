import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Inbox } from 'lucide-vue-next'

import EmptyState from '@/components/ui/EmptyState.vue'

describe('EmptyState', () => {
  it('zeigt Icon, Titel, Text und Aktionen', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Keine offenen Freigaben', description: 'Es wartet nichts.', icon: Inbox },
      slots: { default: '<a class="cta">Alle Apps anzeigen</a>' },
    })

    expect(wrapper.text()).toContain('Keine offenen Freigaben')
    expect(wrapper.text()).toContain('Es wartet nichts.')
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.cta').exists()).toBe(true)
  })

  it('rendert nur, was übergeben wurde', () => {
    const wrapper = mount(EmptyState, { props: { title: 'Leer' } })

    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.findAll('p')).toHaveLength(1)
  })
})
