/**
 * Characterisation of the route table and the global navigation guard, so
 * both can be restructured without changing where anyone ends up.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const h = vi.hoisted(() => ({
  auth: {
    user: null as { role: string } | null,
    isLoading: false,
    isAuthenticated: false,
    initialize: vi.fn(),
    whenSettled: vi.fn(),
    hasAnyRole(...roles: string[]) {
      return !!h.auth.user && roles.includes(h.auth.user.role)
    },
  },
  toastError: vi.fn(),
}))

vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => h.auth }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: h.toastError }) }))

import router, { routes } from '@/router'

const signIn = (role: string | null) => {
  h.auth.user = role ? { role } : null
  h.auth.isAuthenticated = role !== null
}

const go = async (path: string) => {
  await router.push(path).catch(() => {})
  return router.currentRoute.value
}

describe('Routentabelle (Charakterisierung)', () => {
  it('bleibt in Name, Pfad, Meta und Guards gleich', () => {
    const describeRoute = (r: (typeof routes)[number]): unknown => ({
      name: r.name,
      path: r.path,
      meta: r.meta,
      guarded: typeof r.beforeEnter === 'function',
      children: r.children?.map(describeRoute),
    })
    expect(routes.map(describeRoute)).toMatchSnapshot()
  })
})

describe('Navigations-Guard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    signIn(null)
    await router.push('/callback').catch(() => {})
  })

  it('schickt nicht angemeldete Nutzer mit Rücksprungziel zum Login', async () => {
    const route = await go('/apps?tab=mine')
    expect(route.name).toBe('login')
    expect(route.query.returnUrl).toBe('/apps?tab=mine')
    expect(h.auth.initialize).toHaveBeenCalled()
  })

  it('wartet eine laufende Anmeldung ab, bevor es entscheidet', async () => {
    h.auth.isLoading = true
    h.auth.whenSettled.mockImplementation(async () => {
      signIn('teacher')
      h.auth.isLoading = false
    })

    expect((await go('/courses')).name).toBe('courses')
    expect(h.auth.whenSettled).toHaveBeenCalledTimes(1)
  })

  it('initialisiert auf den Callback-Routen nicht', async () => {
    await go('/lti/expired')
    expect(h.auth.initialize).not.toHaveBeenCalled()
  })

  it('schickt Angemeldete vom Login zum Dashboard', async () => {
    signIn('student')
    const route = await go('/login')
    expect(route.name).toBe('dashboard')
  })

  it('lässt Lehrkräfte auf Staff-Routen', async () => {
    signIn('teacher')
    expect((await go('/courses')).name).toBe('courses')
  })

  it('schickt Studierende von Staff-Routen nach /forbidden und nennt die Rollen', async () => {
    signIn('student')
    const route = await go('/courses')
    expect(route.name).toBe('forbidden')
    expect(h.toastError).toHaveBeenCalledTimes(1)
  })

  it('lässt nur Admins in die Freigaben', async () => {
    signIn('teacher')
    expect((await go('/admin/apps')).name).toBe('forbidden')
    signIn('admin')
    expect((await go('/admin/apps')).name).toBe('admin.apps')
  })
})
