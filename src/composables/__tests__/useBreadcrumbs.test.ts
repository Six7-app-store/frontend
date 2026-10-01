import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

const auth = vi.hoisted(() => ({ role: 'teacher' }))

vi.mock('@/composables/useKeycloak', () => ({ useKeycloak: () => ({}) }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: { userId: 'u-1', username: 'kim', role: auth.role },
    hasAnyRole: (...roles: string[]) => roles.includes(auth.role),
  }),
}))

import { useBreadcrumbEntity, useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { ROUTE_NAMES } from '@/router/route-names'
import de from '@/i18n/locales/de'

const Empty = defineComponent({ render: () => h('div') })

async function setup(path: string, role = 'teacher') {
  auth.role = role
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/apps', name: ROUTE_NAMES.apps, component: Empty },
      { path: '/apps/:id', name: ROUTE_NAMES.appsDetail, component: Empty },
      { path: '/deployments', name: ROUTE_NAMES.deploymentsList, component: Empty },
    ],
  })
  await router.push(path)
  await router.isReady()
  let items!: ReturnType<typeof useBreadcrumbs>['items']
  const name = ref<string | undefined>(undefined)
  const Detail = defineComponent({
    setup() {
      items = useBreadcrumbs().items
      useBreadcrumbEntity(() => name.value)
      return () => h('div')
    },
  })
  const wrapper = mount(Detail, { global: { plugins: [router, createI18n({ legacy: false, locale: 'de', messages: { de } })] } })
  return { wrapper, router, name, items: () => items.value.map((crumb) => crumb.label) }
}

describe('useBreadcrumbs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('folgt der Route', async () => {
    const { items, router, wrapper } = await setup('/apps')
    expect(items()).toEqual(['Apps'])

    await router.push('/deployments')
    expect(items()).toEqual(['Deployments'])
    wrapper.unmount()
  })

  it('nennt den Deployment-Bereich für Studierende „Umgebungen“', async () => {
    const { items, wrapper } = await setup('/deployments', 'student')
    expect(items()).toEqual(['Umgebungen'])
    wrapper.unmount()
  })

  it('hängt den Namen der Detailseite an, sobald er geladen ist', async () => {
    const { items, name, wrapper } = await setup('/apps/a1')
    expect(items()).toEqual(['Apps', '…'])

    name.value = 'Online-IDE'
    await nextTick()
    expect(items()).toEqual(['Apps', 'Online-IDE'])
    wrapper.unmount()
  })

  it('vergisst den Namen, wenn die Seite schließt', async () => {
    const first = await setup('/apps/a1')
    first.name.value = 'Online-IDE'
    await nextTick()
    first.wrapper.unmount()

    const second = await setup('/apps/a2')
    expect(second.items()).toEqual(['Apps', '…'])
    second.wrapper.unmount()
  })
})
