/**
 * Characterization tests for ``AppLayout``'s routing-derived UI: header
 * title, mesh background, sidebar links and their role-based visibility
 * and active state. Written before centralising the routing knowledge;
 * the snapshot must stay unchanged by that refactoring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

const auth = vi.hoisted(() => ({ user: null as { userId: string; username: string; role: string } | null }))

vi.mock('@/composables/useKeycloak', () => ({ useKeycloak: () => ({}) }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    get user() {
      return auth.user
    },
    get userId() {
      return auth.user?.userId ?? null
    },
    hasAnyRole: (...roles: string[]) => !!auth.user?.role && roles.includes(auth.user.role),
    logout: vi.fn(),
  }),
}))

import AppLayout from '@/layouts/AppLayout.vue'
import { routes } from '@/router'
import de from '@/i18n/locales/de'

const PATHS = [
  '/', '/dashboard', '/deployments', '/deployments/dep-1', '/apps', '/apps/create', '/apps/app-1',
  '/courses', '/courses/c-1', '/help', '/admin/apps', '/deployment/new/config', '/forbidden',
  '/user', '/does-not-exist', '/apps/app-1/unknown',
]

const render = async (path: string, role: string) => {
  auth.user = { userId: 'u-1', username: 'kim', role }
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(AppLayout, {
    global: { plugins: [router, createI18n({ legacy: false, locale: 'de', messages: { de } })] },
    slots: { default: '<div />' },
  })
  await flushPromises()
  const links = wrapper.findAll('nav a').map((a) => ({
    href: a.attributes('href'),
    text: a.text(),
    active: a.classes().includes('nav-link-active'),
  }))
  const result = {
    title: wrapper.find('.header-title span').text(),
    mesh: wrapper.find('main').classes().includes('mesh-gradient-bg'),
    links,
  }
  wrapper.unmount()
  return result
}

describe('AppLayout routing-derived UI', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it.each(['student', 'teacher', 'admin'])('matches the recorded title, background and navigation (%s)', async (role) => {
    const table: Record<string, Awaited<ReturnType<typeof render>>> = {}
    for (const path of PATHS) {
      table[path] = await render(path, role)
    }
    expect(table).toMatchSnapshot()
  })
})
