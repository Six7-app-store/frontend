/**
 * Route table: unknown URLs must land on the dedicated 404 route instead of
 * rendering an empty page.
 */
import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '@/router'
import { ROUTE_NAMES } from '@/router/route-names'

const router = () => createRouter({ history: createMemoryHistory(), routes })

describe('Routentabelle', () => {
  it.each([
    '/gibt-es-nicht',
    '/apps/app-1/unbekannt',
    '/deployments/dep-1/extra',
  ])('löst die unbekannte URL %s auf die 404-Route auf', (path) => {
    const resolved = router().resolve(path)

    expect(resolved.name).toBe(ROUTE_NAMES.notFound)
    expect(resolved.matched).toHaveLength(1)
    expect(resolved.meta.layout).toBe('app')
    expect(resolved.meta.requiresAuth).toBe(true)
  })

  it.each([
    ['/', ROUTE_NAMES.home],
    ['/apps/app-1', ROUTE_NAMES.appsDetail],
    ['/deployments/dep-1', ROUTE_NAMES.deploymentsDetail],
    ['/forbidden', ROUTE_NAMES.forbidden],
  ])('lässt die bekannte URL %s unverändert', (path, name) => {
    expect(router().resolve(path).name).toBe(name)
  })
})
