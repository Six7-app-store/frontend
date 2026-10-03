import { ref, type Ref } from 'vue'
import { appApi } from '@/api/app.api'
import { dedupeDefinitions } from '@/services/variable-form.service'
import type { AppUpdate, AppVariable, AppVersionApproval } from '@/types'

export type VariablesState = 'idle' | 'loading' | 'loaded' | 'error'

/**
 * One app with its version approvals and configurable variables, and what
 * its owner or an admin can do with it. Every action throws on failure and
 * leaves the local state as it was; the caller decides what to tell the user.
 */
export function useAppDetail(appId: Ref<string>) {
  const app = ref<any>(null)
  const approvals = ref<AppVersionApproval[]>([])
  const isLoading = ref(false)
  const variables = ref<AppVariable[]>([])
  const variablesState = ref<VariablesState>('idle')

  async function load() {
    if (!appId.value) return
    isLoading.value = true
    try {
      app.value = (await appApi.getById(appId.value, false)).data
    } finally {
      isLoading.value = false
    }
  }

  /** Approvals that can't be loaded count as none; the version list then shows no state. */
  async function loadApprovals() {
    if (!appId.value) return
    try {
      approvals.value = (await appApi.listVersionApprovals(appId.value)).data
    } catch {
      approvals.value = []
    }
  }

  /**
   * The variables of one version, as the deployment wizard reads them. The
   * backend clones the repository for this, so it takes seconds; the state
   * tells the page whether the list is still coming or failed (then empty).
   */
  async function loadVariables(version: string) {
    if (!appId.value || !version) return
    variablesState.value = 'loading'
    try {
      variables.value = dedupeDefinitions((await appApi.getVariables(appId.value, version)).data ?? [])
      variablesState.value = 'loaded'
    } catch {
      variables.value = []
      variablesState.value = 'error'
    }
  }

  async function submitVersion(versionTag: string, notes?: string) {
    await appApi.submitVersion(appId.value, versionTag, undefined, notes)
    await loadApprovals()
  }

  async function withdrawVersion(versionTag: string) {
    await appApi.withdrawVersion(appId.value, versionTag)
    await loadApprovals()
  }

  async function setPrivate(isPrivate: boolean) {
    await appApi.update(app.value.appId, { is_private: isPrivate })
    app.value.is_private = isPrivate
  }

  /** Saves ``changes`` and takes over what the backend actually stored. */
  async function update(changes: AppUpdate) {
    const { data } = await appApi.update(app.value.appId, changes)
    app.value = { ...app.value, ...data }
  }

  async function remove() {
    await appApi.delete(app.value.appId)
  }

  return {
    app,
    approvals,
    isLoading,
    variables,
    variablesState,
    load,
    loadApprovals,
    loadVariables,
    submitVersion,
    withdrawVersion,
    setPrivate,
    update,
    remove,
  }
}
