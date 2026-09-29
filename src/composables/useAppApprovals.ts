import { computed, ref } from 'vue'
import { appApi } from '@/api/app.api'
import type { App, AppVersionApproval } from '@/types'

/**
 * The admins' review queue: every app with how many of its versions wait
 * for a decision, the approvals of an app loaded on demand, and the three
 * decisions. A decision throws on failure; on success the local state is
 * patched instead of reloading the queue.
 */
export function useAppApprovals() {
  const apps = ref<App[]>([])
  const isLoading = ref(true)
  // appId → pending versions (from the pending queue, then from the full list)
  const pendingCount = ref<Record<string, number>>({})
  // appId → submissions in any state
  const submissionCount = ref<Record<string, number>>({})
  // appId → loaded approvals (lazy)
  const approvals = ref<Record<string, AppVersionApproval[]>>({})
  // appId → approvals currently loading
  const loading = ref<Record<string, boolean>>({})
  // true = only apps with at least one submission
  const onlyWithSubmissions = ref(true)

  /** Apps to list, those with the most pending versions first. */
  const sortedApps = computed(() => {
    const filtered = onlyWithSubmissions.value
      ? apps.value.filter((a) => (submissionCount.value[a.appId] ?? 0) > 0)
      : apps.value
    return [...filtered].sort(
      (a, b) => (pendingCount.value[b.appId] ?? 0) - (pendingCount.value[a.appId] ?? 0),
    )
  })

  /** Loads the apps and the pending queue; throws when either fails. */
  async function loadAll() {
    isLoading.value = true
    try {
      const [appsRes, pendingRes] = await Promise.all([
        appApi.list(),
        appApi.admin.listPendingApprovals(),
      ])
      apps.value = appsRes.data
      const pending: Record<string, number> = {}
      for (const item of pendingRes.data) pending[item.appId] = (pending[item.appId] ?? 0) + 1
      pendingCount.value = pending
      submissionCount.value = { ...pending }
    } finally {
      isLoading.value = false
    }
  }

  /** Loads an app's approvals once; unloadable ones count as none, so the row stays usable. */
  async function loadApprovals(appId: string) {
    if (approvals.value[appId] !== undefined) return
    loading.value[appId] = true
    try {
      const { data } = await appApi.listVersionApprovals(appId)
      approvals.value[appId] = data
      submissionCount.value[appId] = data.length
      pendingCount.value[appId] = data.filter((a) => a.status === 'pending').length
    } catch {
      approvals.value[appId] = []
    } finally {
      loading.value[appId] = false
    }
  }

  const entryOf = (appId: string, versionTag: string) =>
    approvals.value[appId]?.find((a) => a.version_tag === versionTag)

  function decrementPending(appId: string) {
    if (pendingCount.value[appId]) pendingCount.value[appId] = Math.max(0, pendingCount.value[appId] - 1)
  }

  async function approve(appId: string, versionTag: string) {
    await appApi.admin.approveVersion(appId, versionTag)
    const entry = entryOf(appId, versionTag)
    if (entry) entry.status = 'approved'
    decrementPending(appId)
  }

  function markRejected(appId: string, versionTag: string, reason: string) {
    const entry = entryOf(appId, versionTag)
    if (entry) {
      entry.status = 'rejected'
      entry.rejection_reason = reason
    }
  }

  /** Rejects a pending version. */
  async function reject(appId: string, versionTag: string, reason: string) {
    await appApi.admin.rejectVersion(appId, versionTag, reason)
    markRejected(appId, versionTag, reason)
    decrementPending(appId)
  }

  /** Withdraws the approval of a published version; it was not pending, so no count changes. */
  async function revoke(appId: string, versionTag: string, reason: string) {
    await appApi.admin.revokeVersion(appId, versionTag, reason)
    markRejected(appId, versionTag, reason)
  }

  return {
    apps,
    isLoading,
    pendingCount,
    submissionCount,
    approvals,
    loading,
    onlyWithSubmissions,
    sortedApps,
    loadAll,
    loadApprovals,
    approve,
    reject,
    revoke,
  }
}
