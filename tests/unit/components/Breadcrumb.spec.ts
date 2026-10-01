import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import de from '@/i18n/locales/de'

const mountCrumbs = (items: Array<{ label: string; to?: string }>) =>
  mount(Breadcrumb, {
    props: { items },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })],
      stubs: { RouterLink: RouterLinkStub },
    },
  })

describe('Breadcrumb', () => {
  it('ist eine benannte Navigation mit geordneter Liste', () => {
    const wrapper = mountCrumbs([{ label: 'Apps', to: '/apps' }, { label: 'Online-IDE' }])

    expect(wrapper.get('nav').attributes('aria-label')).toBe(de.breadcrumb.label)
    expect(wrapper.findAll('ol > li')).toHaveLength(2)
  })

  it('verlinkt die oberen Ebenen und markiert die aktuelle Seite', () => {
    const wrapper = mountCrumbs([{ label: 'Apps', to: '/apps' }, { label: 'Online-IDE', to: '/apps/1' }])
    const links = wrapper.findAllComponents(RouterLinkStub)
    const current = wrapper.get('[aria-current="page"]')

    expect(links).toHaveLength(1)
    expect(links[0]!.props('to')).toBe('/apps')
    expect(current.text()).toBe('Online-IDE')
  })

  it('setzt Trenner nur zwischen die Ebenen und verbirgt sie vor Screenreadern', () => {
    const wrapper = mountCrumbs([{ label: 'Kurse', to: '/courses' }, { label: 'WI SE B 23' }])
    const separators = wrapper.findAll('[aria-hidden="true"]')

    expect(separators).toHaveLength(1)
    expect(separators[0]!.text()).toBe('/')
  })

  it('zeigt eine einzelne Ebene als aktuelle Seite ohne Link', () => {
    const wrapper = mountCrumbs([{ label: 'Dashboard' }])

    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0)
    expect(wrapper.get('[aria-current="page"]').text()).toBe('Dashboard')
  })
})
