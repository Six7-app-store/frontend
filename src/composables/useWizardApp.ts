import { computed, ref } from 'vue'
import { appApi } from '@/api/app.api'
import { useAppCatalog } from '@/composables/useAppCatalog'
import { useAuthStore } from '@/stores/auth.store'
import { useDeploymentStore } from '@/stores/deployment.store'
import { versionOptions } from '@/services/app-presentation.service'
import { deployableApps } from '@/services/wizard-app.service'
import type { App } from '@/types'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

/**
 * State of the wizard's app step: the deployable apps with a search (the
 * approved ones), the chosen app with its newest approved version preselected,
 * and the chosen app's versions to choose from (``loadVersions``, which asks
 * Git, so it runs for the chosen app only).
 */
export function useWizardApp() {
  const store = useDeploymentStore()
  const auth = useAuthStore()
  const catalog = useAppCatalog()

  const query = ref('')
  const appsState = ref<LoadState>('idle')
  const apps = computed(() => deployableApps(catalog.apps.value, query.value, auth.userId, auth.user?.role === 'admin'))
  const chosen = computed<App | null>(() =>
    catalog.apps.value.find((app) => app.appId === store.draft.appId) ?? null)

  const versions = ref<string[]>([])
  const versionsState = ref<LoadState>('idle')
  let versionsOf: string | null = null

  async function loadApps() {
    appsState.value = 'loading'
    try {
      await catalog.load()
      appsState.value = 'ready'
    } catch {
      appsState.value = 'error'
    }
  }

  /** Chooses ``app`` with its newest approved version. */
  function choose(app: App) {
    store.chooseRelease({ appId: app.appId, appName: app.name, releaseTag: app.latestApprovedVersion ?? '' })
  }

  function chooseVersion(tag: string) {
    if (!store.draft.appId) return
    store.chooseRelease({ appId: store.draft.appId, appName: store.draft.appName, releaseTag: tag })
  }

  /** The chosen app's versions — approved ones only, unless the caller is an admin. */
  async function loadVersions() {
    const appId = store.draft.appId
    if (!appId || (versionsOf === appId && versionsState.value === 'ready')) return
    versionsOf = appId
    versions.value = []
    versionsState.value = 'loading'
    try {
      const { data } = await appApi.getById(appId)
      if (versionsOf !== appId) return
      const allVersions = versionOptions(data.versions)
      versions.value = auth.user?.role === 'admin'
        ? [...new Set([...allVersions, ...(data.approvedVersions ?? [])])]
        : (data.approvedVersions ?? [])
      versionsState.value = 'ready'
      // Admins may test unapproved versions; everyone else sees only approvals.
      const newest = versions.value[0]
      if (store.draft.appId === appId && !versions.value.includes(store.draft.releaseTag)) {
        chooseVersion(newest ?? '')
      }
    } catch {
      if (versionsOf === appId) versionsState.value = 'error'
    }
  }

  return { query, apps, appsState, chosen, versions, versionsState, loadApps, choose, chooseVersion, loadVersions }
}
