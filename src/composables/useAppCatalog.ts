import { ref } from 'vue'
import { appApi } from '@/api/app.api'
import type { App, AppVersionApproval } from '@/types'

/**
 * The apps the current user may see, as the catalogue and the Moodle deep
 * link list them. Optionally loads the version approvals of some apps too
 * (the catalogue does it for the user's own apps, to show their store
 * state).
 */
export function useAppCatalog() {
  const apps = ref<App[]>([])
  const approvals = ref<Record<string, AppVersionApproval[]>>({})
  const isLoading = ref(false)

  /**
   * Loads the app list; throws when that fails, leaving the list empty.
   * Approvals of the apps matching ``approvalsFor`` that can't be loaded
   * count as none.
   */
  async function load(options: { approvalsFor?: (app: App) => boolean } = {}) {
    isLoading.value = true
    try {
      const { data } = await appApi.list()
      apps.value = Array.isArray(data) ? data : []
      const withApprovals = options.approvalsFor ? apps.value.filter(options.approvalsFor) : []
      await Promise.all(withApprovals.map(async (app) => {
        try {
          approvals.value[app.appId] = (await appApi.listVersionApprovals(app.appId)).data
        } catch {
          approvals.value[app.appId] = []
        }
      }))
    } catch (err) {
      apps.value = []
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return { apps, approvals, isLoading, load }
}
