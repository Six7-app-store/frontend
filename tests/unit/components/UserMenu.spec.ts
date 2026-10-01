import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

const logout = vi.hoisted(() => vi.fn())

vi.mock('@/composables/useKeycloak', () => ({ useKeycloak: () => ({}) }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ user: { userId: 'u-1', username: 'kim', role: 'teacher' }, logout }),
}))

import UserMenu from '@/components/layout/UserMenu.vue'
import { ROUTE_NAMES } from '@/router/route-names'
import de from '@/i18n/locales/de'

const Empty = defineComponent({ render: () => h('div') })

async function mountMenu() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: ROUTE_NAMES.home, component: Empty },
      { path: '/user', name: ROUTE_NAMES.user, component: Empty },
    ],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(UserMenu, {
    attachTo: document.body,
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'de', messages: { de } })],
      stubs: { teleport: true },
    },
  })
  return { wrapper, router }
}

describe('UserMenu', () => {
  beforeEach(() => logout.mockClear())

  it('zeigt Initial und Namen als Auslöser des Menüs', async () => {
    const { wrapper } = await mountMenu()
    const trigger = wrapper.get('button')

    expect(trigger.text()).toContain('kim')
    expect(trigger.text()).toContain('K')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('öffnet das Menü mit Profil und Abmelden', async () => {
    const { wrapper } = await mountMenu()

    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual([de.nav.profile, de.nav.logout])
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('führt „Profil“ zur Profilseite', async () => {
    const { wrapper, router } = await mountMenu()
    await wrapper.get('button').trigger('click')
    await nextTick()

    await wrapper.findAll('[role="menuitem"]')[0]!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.user)
    wrapper.unmount()
  })

  it('meldet bei „Abmelden“ ab', async () => {
    const { wrapper } = await mountMenu()
    await wrapper.get('button').trigger('click')
    await nextTick()

    await wrapper.findAll('[role="menuitem"]')[1]!.trigger('click')

    expect(logout).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
