import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'

/**
 * Role-based access to routes, read from ``meta.requiresRole`` of the route
 * table — the same rule the navigation guard in ``router/index.ts`` enforces.
 *
 * Use it to hide links/tiles the current user could not open, instead of
 * repeating the role rule (``isStaff``/``isAdmin``) next to the link.
 * Purely cosmetic; the guard and the backend remain authoritative.
 */
export function useRouteAccess() {
  const router = useRouter()
  const authStore = useAuthStore()

  const canAccess = (to: RouteLocationRaw): boolean => {
    const requiresRole = router.resolve(to).meta.requiresRole as UserRole[] | undefined
    if (!requiresRole || requiresRole.length === 0) return true
    return authStore.hasAnyRole(...requiresRole)
  }

  return { canAccess }
}
