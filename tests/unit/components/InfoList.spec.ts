import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import InfoList from '@/components/ui/InfoList.vue'

describe('InfoList', () => {
  it('zeigt Bezeichnung und Wert je Eintrag', () => {
    const wrapper = mount(InfoList, { props: { items: [{ label: 'Typ', value: 'Packer' }, { label: 'Version', value: 'v1.2.0', mono: true }] } })

    expect(wrapper.findAll('dt').map((dt) => dt.text())).toEqual(['Typ', 'Version'])
    expect(wrapper.findAll('dd').map((dd) => dd.text())).toEqual(['Packer', 'v1.2.0'])
    expect(wrapper.findAll('dd')[1]!.classes()).toContain('font-mono')
    expect(wrapper.findAll('dd')[0]!.classes()).not.toContain('font-mono')
  })

  it('blendet Einträge ohne Wert ganz aus', () => {
    const wrapper = mount(InfoList, {
      props: { items: [{ label: 'Typ', value: 'Packer' }, { label: 'Commit', value: null }, { label: 'Autor' }, { label: 'Leer', value: '  ' }] },
    })

    expect(wrapper.findAll('dt').map((dt) => dt.text())).toEqual(['Typ'])
  })

  it('zeigt die Zahl 0 als Wert', () => {
    const wrapper = mount(InfoList, { props: { items: [{ label: 'Versionen', value: 0 }] } })

    expect(wrapper.get('dd').text()).toBe('0')
  })

  it('rendert gar nichts, wenn alle Einträge leer sind', () => {
    const wrapper = mount(InfoList, { props: { items: [{ label: 'Commit', value: '' }] } })

    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('macht Werte mit href zu externen Links', () => {
    const wrapper = mount(InfoList, { props: { items: [{ label: 'Link', value: 'Release', href: 'https://x.test/r' }] } })

    const link = wrapper.get('dd a')
    expect(link.text()).toBe('Release')
    expect(link.attributes('href')).toBe('https://x.test/r')
    expect(link.attributes('rel')).toContain('noopener')
  })
})
