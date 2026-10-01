import { userApi } from '@/api/user.api'
import { useDeploymentStore } from '@/stores/deployment.store'

type Student = { userId?: string; firstName?: string; lastName?: string; username?: string; email?: string }

const hasName = (s: Student | undefined) => !!(s && (s.firstName || s.lastName || s.username || s.email))

/**
 * The wizard's one directory of students, keyed by ``userId``: the config
 * step fills it from course lists and searches, the later steps read names
 * from it. Backed by ``deploymentStore.studentCache``, so it survives moving
 * between the steps.
 *
 * Keyed by ``userId`` and not ``keycloak_id``: a student who arrives through
 * a Moodle LTI launch never passes Keycloak and has no such ID.
 */
export function useStudentDirectory() {
  const cache = useDeploymentStore().studentCache as Map<string, Student>

  function studentOf(id: string): Student | undefined {
    return cache.get(id)
  }

  /** Adds ``users`` to the directory; an entry is only replaced by one that knows more of the name. */
  function remember(users: readonly Student[] | null | undefined) {
    for (const s of users || []) {
      if (!s?.userId || typeof s.userId !== 'string' || !s.userId.trim()) continue
      const existing = cache.get(s.userId)
      if (!existing || (s.firstName && !existing.firstName) || (s.lastName && !existing.lastName)) {
        cache.set(s.userId, s)
      }
    }
  }

  /**
   * Makes sure every ID in ``ids`` resolves to a named entry. An entry stored
   * under another key by an earlier step is reused; the rest is fetched. A
   * user that can't be loaded keeps a ``{ userId }`` placeholder, so the step
   * stays usable and shows the ID instead.
   */
  async function ensureLoaded(ids: readonly string[]) {
    const missing: string[] = []
    for (const id of ids) {
      const cached = cache.get(id)
      if (hasName(cached)) continue
      const found = [...cache.values()].find((s) => s?.userId === id && hasName(s))
      if (found) {
        cache.set(id, found)
        continue
      }
      missing.push(id)
      if (!cached) cache.set(id, { userId: id })
    }
    if (missing.length === 0) return

    const results = await Promise.all(
      missing.map((id) => userApi.getById(id).then((res) => res.data).catch(() => null)),
    )
    // Cached under the requested ID — that's the key the views look up.
    results.forEach((user, i) => {
      if (user?.userId) cache.set(missing[i]!, user)
    })
  }

  return { studentOf, remember, ensureLoaded }
}
