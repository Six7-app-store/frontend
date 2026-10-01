/**
 * Tests for the app shell's routing-derived UI: the breadcrumb trail, the
 * sidebar links with their role-based visibility and active state, the admin
 * group, the collapse toggle and the topbar controls.
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
import en from '@/i18n/locales/en'

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
  const links = wrapper.findAll('aside nav a').map((a) => ({
    href: a.attributes('href'),
    text: a.text(),
    active: a.attributes('aria-current') === 'page',
  }))
  const result = {
    breadcrumb: wrapper.findAll('header nav li').map((li) => li.text()),
    links,
  }
  wrapper.unmount()
  return result
}

describe('AppLayout routing-derived UI', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it.each(['student', 'teacher', 'admin'])('matches the recorded breadcrumb and navigation (%s)', async (role) => {
    const table: Record<string, Awaited<ReturnType<typeof render>>> = {}
    for (const path of PATHS) {
      table[path] = await render(path, role)
    }
    expect(table).toMatchSnapshot()
  })

  // The active item follows the section a route belongs to, not just the exact
  // link target — detail and create pages belong to their section as well.
  it.each([
    ['/', 'Dashboard'],
    ['/dashboard', 'Dashboard'],
    ['/apps', 'Apps'],
    ['/apps/create', 'Apps'],
    ['/apps/app-1', 'Apps'],
    ['/courses', 'Kurse'],
    ['/courses/c-1', 'Kurse'],
    ['/deployments', 'Deployments'],
    ['/deployments/dep-1', 'Deployments'],
    ['/admin/apps', 'Freigaben'],
    ['/help', 'Hilfe'],
  ])('markiert unter %s den Menüpunkt %s als aktiv', async (path, label) => {
    const { links } = await render(path, 'admin')

    expect(links.filter((link) => link.active).map((link) => link.text)).toEqual([label])
  })

  it.each(['/does-not-exist', '/deployment/new/config', '/forbidden'])(
    'markiert unter %s keinen Menüpunkt als aktiv',
    async (path) => {
      const { links } = await render(path, 'admin')

      expect(links.filter((link) => link.active)).toEqual([])
    },
  )
})

describe('AppLayout theme toggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sits in the header between the language switch and the user menu', async () => {
    auth.user = { userId: 'u-1', username: 'kim', role: 'student' }
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(AppLayout, {
      global: { plugins: [router, createI18n({ legacy: false, locale: 'de', messages: { de } })] },
      slots: { default: '<div />' },
    })

    const buttons = wrapper.findAll('header button').map((b) => b.attributes('aria-label') ?? b.text())
    const de_ = buttons.indexOf('DE')
    const en_ = buttons.indexOf('EN')
    const theme = buttons.indexOf(de.theme.toDark)
    const user = buttons.findIndex((label) => label.includes('kim'))

    expect(theme).toBeGreaterThan(Math.max(de_, en_))
    expect(theme).toBeLessThan(user)
    wrapper.unmount()
  })
})

describe('AppLayout shell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.documentElement.removeAttribute('data-theme')
  })

  const mountShell = async (path: string, role: string, locale: 'de' | 'en' = 'de') => {
    auth.user = { userId: 'u-1', username: 'kim', role }
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(AppLayout, {
      attachTo: document.body,
      global: { plugins: [router, createI18n({ legacy: false, locale, messages: { de, en } })] },
      slots: { default: '<p class="page">Inhalt</p>' },
    })
    await flushPromises()
    return wrapper
  }

  it('hat keinen mittigen Seitentitel mehr, nur den Breadcrumb in der Topbar', async () => {
    const wrapper = await mountShell('/apps', 'admin')

    expect(wrapper.find('.header-title').exists()).toBe(false)
    expect(wrapper.get('header nav').attributes('aria-label')).toBe(de.breadcrumb.label)
    expect(wrapper.get('header nav [aria-current="page"]').text()).toBe('Apps')
    wrapper.unmount()
  })

  it('setzt Freigaben für Admins in die Gruppe „Verwaltung“, Hilfe ans Ende', async () => {
    const wrapper = await mountShell('/', 'admin')
    const group = wrapper.get('aside nav ul[aria-labelledby]')

    expect(wrapper.get('aside nav p').text()).toBe('Verwaltung')
    expect(group.findAll('a').map((a) => a.text())).toEqual(['Freigaben'])
    const all = wrapper.findAll('aside nav a').map((a) => a.text())
    expect(all[all.length - 1]).toBe('Hilfe')
    wrapper.unmount()
  })

  it('zeigt Nicht-Admins weder die Gruppe noch Freigaben', async () => {
    const wrapper = await mountShell('/', 'student')

    expect(wrapper.find('aside nav p').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Freigaben')
    wrapper.unmount()
  })

  it('klappt die Seitenleiste ein und aus, ohne die Links zu verlieren', async () => {
    const wrapper = await mountShell('/', 'admin')
    const aside = wrapper.get('aside')
    const toggle = wrapper.get('header button')

    expect(aside.classes()).toContain('w-sidebar')
    expect(toggle.attributes('aria-label')).toBe(de.nav.collapse)
    expect(toggle.attributes('aria-expanded')).toBe('true')

    await toggle.trigger('click')

    expect(aside.classes()).toContain('w-sidebar-collapsed')
    expect(toggle.attributes('aria-label')).toBe(de.nav.expand)
    expect(toggle.attributes('aria-expanded')).toBe('false')
    // Collapsed, the labels stay for screen readers and as tooltips.
    const dashboard = wrapper.get('aside nav a')
    expect(dashboard.attributes('title')).toBe('Dashboard')
    expect(dashboard.get('span').classes()).toContain('sr-only')
    expect(wrapper.get('aside img').attributes('src')).toContain('based-icon')

    await toggle.trigger('click')
    expect(aside.classes()).toContain('w-sidebar')
    wrapper.unmount()
  })

  it('zeigt das helle Logo im Light- und das dunkle im Dark-Theme', async () => {
    const wrapper = await mountShell('/', 'admin')
    expect(wrapper.get('aside img').attributes('src')).toContain('based-logo-light')

    await wrapper.get('header button[aria-label="' + de.theme.toDark + '"]').trigger('click')
    expect(wrapper.get('aside img').attributes('src')).toContain('based-logo-dark')
    // useTheme is a module singleton: leave it in Light for the next test.
    await wrapper.get('header button[aria-label="' + de.theme.toLight + '"]').trigger('click')
    wrapper.unmount()
  })

  it('führt die Sprachwahl und den Theme-Schalter in der Topbar', async () => {
    const wrapper = await mountShell('/', 'admin', 'en')

    const group = wrapper.get('header [role="group"]')
    expect(group.attributes('aria-label')).toBe(en.nav.language)
    expect(group.findAll('button').map((b) => b.text())).toEqual(['DE', 'EN'])
    expect(group.findAll('button')[1]!.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find(`header button[aria-label="${en.theme.toDark}"]`).exists()).toBe(true)
    wrapper.unmount()
  })

  it('rendert den Seiteninhalt im Hauptbereich', async () => {
    const wrapper = await mountShell('/', 'student')

    expect(wrapper.get('main .page').text()).toBe('Inhalt')
    wrapper.unmount()
  })
})
