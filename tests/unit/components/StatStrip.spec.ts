import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import StatStrip from '@/components/ui/StatStrip.vue'

const items = [
  { id: 'deployments', label: 'Deployments', value: 7, to: '/deployments' },
  { id: 'apps', label: 'Apps', value: 4, to: { name: 'apps' } },
  { id: 'note', label: 'Hinweis', value: '–' },
]

describe('StatStrip', () => {
  it('zeigt Bezeichnung und Zahl je Kennzahl', () => {
    const wrapper = mount(StatStrip, { props: { items }, global: { stubs: { RouterLink: RouterLinkStub } } })
    const cells = wrapper.findAll('li')

    expect(cells).toHaveLength(3)
    expect(cells[0]!.text()).toContain('Deployments')
    expect(cells[0]!.text()).toContain('7')
    expect(cells[2]!.text()).toContain('–')
  })

  it('verlinkt nur Kennzahlen mit Ziel', () => {
    const wrapper = mount(StatStrip, { props: { items }, global: { stubs: { RouterLink: RouterLinkStub } } })
    const links = wrapper.findAllComponents(RouterLinkStub)

    expect(links.map((link) => link.props('to'))).toEqual(['/deployments', { name: 'apps' }])
    expect(wrapper.findAll('li')[2]!.find('a').exists()).toBe(false)
  })
})
