import { computed, ref } from 'vue'
import { appApi } from '@/api/app.api'
import { useAppCatalog } from '@/composables/useAppCatalog'
import { useDeploymentStore } from '@/stores/deployment.store'
import { versionOptions } from '@/services/app-presentation.service'
import { deployableApps } from '@/services/wizard-app.service'
import type { App } from '@/types'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

/**
 * State of the wizard's app step: the deployable apps with a search, the
 * chosen app with its newest approved version preselected, and — only on
 * request, because it asks Git — the other versions to choose from.
 */
export function useWizardApp() {
  const store = useDeploymentStore()
  const catalog = useAppCatalog()

  const query = ref('')
  const appsState = ref<LoadState>('idle')
  const apps = computed(() => deployableApps(catalog.apps.value, query.value))
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

  /** The chosen app's versions — approved ones only, unless it is the user's own. */
  async function loadVersions() {
    const appId = store.draft.appId
    if (!appId || (versionsOf === appId && versionsState.value === 'ready')) return
    versionsOf = appId
    versionsState.value = 'loading'
    try {
      const { data } = await appApi.getById(appId)
      if (versionsOf !== appId) return
      versions.value = versionOptions(data.versions)
      versionsState.value = 'ready'
    } catch {
      if (versionsOf === appId) versionsState.value = 'error'
    }
  }

  return { query, apps, appsState, chosen, versions, versionsState, loadApps, choose, chooseVersion, loadVersions }
}
