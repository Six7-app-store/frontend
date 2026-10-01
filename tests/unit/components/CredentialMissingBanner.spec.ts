import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import CredentialMissingBanner from '@/components/CredentialMissingBanner.vue'
import AlertBox from '@/components/ui/AlertBox.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/deployment/new/config', name: 'deployment.config', component: { template: '<div />' } },
    { path: '/user/openstack', name: 'user.openstack', component: { template: '<div />' } },
  ],
})

function mountBanner(props: Record<string, unknown>) {
  return mount(CredentialMissingBanner, {
    props,
    global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('CredentialMissingBanner', () => {
  it.each([
    ['warning', 'warning', 'btn-primary'],
    ['error', 'danger', 'btn-primary'],
    ['lock', 'info', 'btn-secondary'],
  ] as const)('zeigt %s als AlertBox im Ton %s', (variant, tone, ctaClass) => {
    const wrapper = mountBanner({
      variant, title: 'Credentials fehlen', message: 'Bitte einrichten.', cta: 'Jetzt einrichten', ctaTo: { name: 'user.openstack' },
    })

    expect(wrapper.findComponent(AlertBox).props('tone')).toBe(tone)
    expect(wrapper.text()).toContain('Credentials fehlen')
    expect(wrapper.text()).toContain('Bitte einrichten.')
    expect(wrapper.getComponent(RouterLinkStub).classes()).toContain(ctaClass)
  })

  it('schickt nach dem Einrichten über next zurück', () => {
    const wrapper = mountBanner({ cta: 'Jetzt einrichten', ctaTo: { name: 'user.openstack' }, next: { name: 'deployment.config' } })

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({
      name: 'user.openstack',
      query: { next: '/deployment/new/config' },
    })
  })

  it('zeigt ohne Ziel keine Aktion', () => {
    const wrapper = mountBanner({ title: 'Credentials fehlen', cta: 'Jetzt einrichten' })

    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
  })
})
