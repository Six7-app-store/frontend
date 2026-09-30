import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Lock } from 'lucide-vue-next'

import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { StatusTone } from '@/types/tone'

describe('StatusBadge', () => {
  it.each([
    ['success', 'status-dot-success', 'text-success'],
    ['warning', 'status-dot-warning', 'text-warning'],
    ['danger', 'status-dot-danger', 'text-danger'],
    ['neutral', 'status-dot-neutral', 'text-fg-muted'],
  ] as const)('zeigt den Status %s als Punkt mit Text', (tone: StatusTone, dot, text) => {
    const wrapper = mount(StatusBadge, { props: { tone }, slots: { default: 'Läuft' } })

    expect(wrapper.text()).toBe('Läuft')
    expect(wrapper.get('.status-dot').classes()).toContain(dot)
    expect(wrapper.classes()).toContain(text)
  })

  it('ersetzt den Punkt durch ein Icon, wenn der Status eines hat', () => {
    const wrapper = mount(StatusBadge, { props: { tone: 'neutral', icon: Lock }, slots: { default: 'Privat' } })

    expect(wrapper.find('.status-dot').exists()).toBe(false)
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('hat eine größere Variante für Seitenköpfe', () => {
    const small = mount(StatusBadge, { props: { tone: 'success' } })
    const medium = mount(StatusBadge, { props: { tone: 'success', size: 'md' } })

    expect(small.classes()).toContain('text-sm')
    expect(medium.classes()).toContain('text-base')
  })
})
