<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ChevronDown, ChevronRight,
  Check, X, RotateCcw, Inbox, ExternalLink,
} from 'lucide-vue-next'
import ReasonModal from '@/components/ui/ReasonModal.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import AppVersionStatusBadge from '@/components/ui/AppVersionStatusBadge.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EntityListState from '@/components/ui/EntityListState.vue'
import { appApi } from '@/api/app.api'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import type { App, AppVersionApproval } from '@/types'

const { t } = useI18n()
const toast = useToast()

// ----------------------------------------------------------------
// State
// ----------------------------------------------------------------
const isLoading = ref(true)
const apps = ref<App[]>([])
// appId → pending count (from initial pending queue load)
const pendingCountMap = ref<Record<string, number>>({})
// appId → total submission count (any status)
const submissionCountMap = ref<Record<string, number>>({})
// appId → loaded approvals (lazy)
const approvalsMap = ref<Record<string, AppVersionApproval[]>>({})
// appId → currently loading
const loadingMap = ref<Record<string, boolean>>({})
// which app is expanded
const expandedAppId = ref<string | null>(null)
// filter: true = only apps with submissions
const onlyWithSubmissions = ref(true)

// Reject modal (single version only)
const showRejectModal = ref(false)
const rejectTarget = ref<{ appId: string; appName: string; versionTag: string } | null>(null)
const rejectionReason = ref('')
const isRejecting = ref(false)

// Revoke modal
const showRevokeModal = ref(false)
const revokeTarget = ref<{ appId: string; versionTag: string } | null>(null)
const revokeReason = ref('')
const isRevoking = ref(false)

// Per-version action loading
const actingOn = ref<string | null>(null) // `${appId}:${versionTag}`

// ----------------------------------------------------------------
// Computed
// ----------------------------------------------------------------
const sortedApps = computed(() => {
  const filtered = onlyWithSubmissions.value
    ? apps.value.filter(a => (submissionCountMap.value[a.appId] ?? 0) > 0)
    : apps.value
  return [...filtered].sort((a, b) => {
    const pa = pendingCountMap.value[a.appId] ?? 0
    const pb = pendingCountMap.value[b.appId] ?? 0
    return pb - pa
  })
})

// ----------------------------------------------------------------
// Load
// ----------------------------------------------------------------
const loadAll = async () => {
  isLoading.value = true
  try {
    const [appsRes, pendingRes] = await Promise.all([
      appApi.list(),
      appApi.admin.listPendingApprovals(),
    ])
    apps.value = appsRes.data

    // Build pending + submission count maps from the pending queue
    const pending: Record<string, number> = {}
    const submissions: Record<string, number> = {}
    for (const item of pendingRes.data) {
      pending[item.appId] = (pending[item.appId] ?? 0) + 1
      submissions[item.appId] = (submissions[item.appId] ?? 0) + 1
    }
    pendingCountMap.value = pending
    submissionCountMap.value = submissions
  } catch {
    toast.error(t('AdminAppsView.loadError'))
  } finally {
    isLoading.value = false
  }
}

const loadApprovals = async (appId: string) => {
  if (approvalsMap.value[appId] !== undefined) return
  loadingMap.value[appId] = true
  try {
    const res = await appApi.listVersionApprovals(appId)
    approvalsMap.value[appId] = res.data
    // Update submission count now that we have the full picture
    submissionCountMap.value[appId] = res.data.length
    pendingCountMap.value[appId] = res.data.filter(a => a.status === 'pending').length
  } catch {
    // Treat unloadable approvals as none; the row stays usable.
    approvalsMap.value[appId] = []
  } finally {
    loadingMap.value[appId] = false
  }
}

const toggleApp = async (appId: string) => {
  if (expandedAppId.value === appId) {
    expandedAppId.value = null
    return
  }
  expandedAppId.value = appId
  await loadApprovals(appId)
}

// ----------------------------------------------------------------
// Actions
// ----------------------------------------------------------------
const handleApprove = async (appId: string, versionTag: string) => {
  actingOn.value = `${appId}:${versionTag}`
  try {
    await appApi.admin.approveVersion(appId, versionTag)
    toast.success(t('AdminAppsView.approveSuccess'))
    // Update local state
    const list = approvalsMap.value[appId]
    if (list) {
      const entry = list.find(a => a.version_tag === versionTag)
      if (entry) entry.status = 'approved'
    }
    if (pendingCountMap.value[appId]) {
      pendingCountMap.value[appId] = Math.max(0, pendingCountMap.value[appId] - 1)
    }
  } catch {
    toast.error(t('AdminAppsView.approveError'))
  } finally {
    actingOn.value = null
  }
}

const openRejectModal = (appId: string, appName: string, versionTag: string) => {
  rejectTarget.value = { appId, appName, versionTag }
  rejectionReason.value = ''
  showRejectModal.value = true
}

// Shared logic behind reject and revoke: both validate a target + reason,
// flip a loading flag, call an admin API method, mark the matching version
// entry as rejected with the given reason, close the modal, and clear the
// loading flag. Only the API method, the target, the i18n keys, the loading
// flag, the modal, and the optional pending-count decrement differ.
const submitRejection = async (params: {
  target: { appId: string; versionTag: string } | null
  reason: string
  apiCall: (appId: string, versionTag: string, reason: string) => Promise<unknown>
  setLoading: (value: boolean) => void
  closeModal: () => void
  successKey: string
  errorKey: string
  decrementPending: boolean
}) => {
  if (!params.target || !params.reason.trim()) return
  const { appId, versionTag } = params.target
  const reason = params.reason.trim()
  params.setLoading(true)
  try {
    await params.apiCall(appId, versionTag, reason)
    toast.success(t(params.successKey))
    const list = approvalsMap.value[appId]
    if (list) {
      const entry = list.find(a => a.version_tag === versionTag)
      if (entry) {
        entry.status = 'rejected'
        entry.rejection_reason = reason
      }
    }
    if (params.decrementPending && pendingCountMap.value[appId]) {
      pendingCountMap.value[appId] = Math.max(0, pendingCountMap.value[appId] - 1)
    }
    params.closeModal()
  } catch {
    toast.error(t(params.errorKey))
  } finally {
    params.setLoading(false)
  }
}

const handleReject = async () => {
  await submitRejection({
    target: rejectTarget.value,
    reason: rejectionReason.value,
    apiCall: appApi.admin.rejectVersion,
    setLoading: value => { isRejecting.value = value },
    closeModal: () => { showRejectModal.value = false },
    successKey: 'AdminAppsView.rejectSuccess',
    errorKey: 'AdminAppsView.rejectError',
    decrementPending: true,
  })
}

const openRevokeModal = (appId: string, versionTag: string) => {
  revokeTarget.value = { appId, versionTag }
  revokeReason.value = ''
  showRevokeModal.value = true
}

const handleRevoke = async () => {
  await submitRejection({
    target: revokeTarget.value,
    reason: revokeReason.value,
    apiCall: appApi.admin.revokeVersion,
    setLoading: value => { isRevoking.value = value },
    closeModal: () => { showRevokeModal.value = false },
    successKey: 'AdminAppsView.revokeSuccess',
    errorKey: 'AdminAppsView.revokeError',
    decrementPending: false,
  })
}

onMounted(loadAll)
</script>

<template>
  <div class="p-6">

    <PageHeader :title="$t('AdminAppsView.title')" :subtitle="$t('AdminAppsView.subtitle')">
      <template #actions>
        <!-- Filter toggle as the page action (page-specific, so it's a slot
             rather than hard-wired). -->
        <div class="flex items-center gap-2 text-sm">
          <span class="text-fg-muted">{{ $t('AdminAppsView.filterLabel') }}</span>
          <ToggleSwitch
            v-model="onlyWithSubmissions"
            size="sm"
            :label="$t('AdminAppsView.filterOnlySubmissions')"
          />
          <span class="text-fg font-medium">{{ $t('AdminAppsView.filterOnlySubmissions') }}</span>
        </div>
      </template>
    </PageHeader>

    <EntityListState
      :is-loading="isLoading && apps.length === 0"
      :is-empty="!isLoading && apps.length === 0"
      :icon="Inbox"
      :empty-message="$t('AdminAppsView.emptyAppsTitle')"
    >
      <!-- Accordion list. Apps with pending submissions come first (see
           ``sortedApps``). This is a list, not a grid, because the approval
           workflow needs expandable rows. -->

      <!-- Filter active but no open submissions → dedicated empty state
           (apps.length > 0 but sortedApps.length === 0). -->
      <div
        v-if="sortedApps.length === 0"
        class="flex flex-col items-center justify-center py-16 px-6 text-center bg-line/[.04] border border-dashed border-subtle rounded-xl"
      >
        <div class="w-14 h-14 rounded-full bg-panel border border-subtle flex items-center justify-center mb-4">
          <Inbox :size="28" class="text-icon" />
        </div>
        <h3 class="text-base font-semibold text-fg mb-1">
          {{ $t('AdminAppsView.emptyNoSubmissionsTitle') }}
        </h3>
        <p class="text-sm text-fg-muted max-w-sm">
          {{ $t('AdminAppsView.emptyNoSubmissionsDesc') }}
        </p>
        <button
          @click="onlyWithSubmissions = false"
          class="mt-5 text-sm font-medium text-accent-fg hover:text-accent-fg underline-offset-2 hover:underline"
        >
          {{ $t('AdminAppsView.emptyShowAll') }}
        </button>
      </div>

      <div v-else class="space-y-2">
      <div
        v-for="app in sortedApps"
        :key="app.appId"
        class="border border-subtle rounded-xl overflow-hidden"
      >
        <!-- App row (header) -->
        <button
          class="w-full flex items-center gap-4 px-5 py-4 bg-panel hover:bg-line/[.04] transition-colors text-left"
          @click="toggleApp(app.appId)"
        >
          <component
            :is="expandedAppId === app.appId ? ChevronDown : ChevronRight"
            :size="18"
            class="text-fg-muted flex-shrink-0"
          />

          <!-- App name -->
          <span class="font-semibold text-fg flex-grow">{{ app.name }}</span>

          <!-- Link to app detail -->
          <RouterLink
            :to="{ name: ROUTE_NAMES.appsDetail, params: { id: app.appId } }"
            class="text-fg-muted hover:text-accent-fg transition-colors p-1 rounded"
            :title="$t('AdminAppsView.goToApp')"
            @click.stop
          >
            <ExternalLink :size="15" />
          </RouterLink>

          <!-- Pending badge -->
          <span
            v-if="pendingCountMap[app.appId] && !app.is_private"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-dot/10 text-warning"
          >
            {{ pendingCountMap[app.appId] }} {{ $t('AdminAppsView.pendingLabel') }}
          </span>
          <span
            v-else-if="app.is_private"
            class="text-xs text-fg-muted"
          >
            {{ $t('AdminAppsView.privateLabel') }}
          </span>
          <span
            v-else
            class="text-xs text-fg-muted"
          >
            {{ $t('AdminAppsView.noPendingLabel') }}
          </span>
        </button>

        <!-- Expanded: versions -->
        <div v-if="expandedAppId === app.appId" class="border-t border-subtle bg-line/[.04]">

          <!-- Private app: no pending submissions shown -->
          <div
            v-if="app.is_private"
            class="px-6 py-4 text-sm text-fg-muted italic"
          >
            {{ $t('AdminAppsView.privateAppNote') }}
          </div>

          <!-- Loading approvals -->
          <div v-else-if="loadingMap[app.appId]" class="flex justify-center py-6">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
          </div>

          <!-- No entries -->
          <div
            v-else-if="!(approvalsMap[app.appId] ?? []).length"
            class="px-6 py-4 text-sm text-fg-muted italic"
          >
            {{ $t('AdminAppsView.noVersionsSubmitted') }}
          </div>

          <!-- Version table -->
          <div v-else class="px-4 pb-3">
          <table class="w-full text-sm">
            <thead class="border-b border-subtle">
              <tr>
                <th class="text-left py-2 px-2 text-xs font-semibold text-fg-muted uppercase tracking-wide">{{ $t('AdminAppsView.colVersion') }}</th>
                <th class="text-left py-2 px-4 text-xs font-semibold text-fg-muted uppercase tracking-wide">{{ $t('AdminAppsView.colStatus') }}</th>
                <th class="text-left py-2 px-4 text-xs font-semibold text-fg-muted uppercase tracking-wide">{{ $t('AdminAppsView.colDate') }}</th>
                <th class="text-right py-2 px-2 text-xs font-semibold text-fg-muted uppercase tracking-wide">{{ $t('AdminAppsView.colActions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr
                v-for="approval in (approvalsMap[app.appId] ?? [])"
                :key="approval.approvalId"
                class="bg-panel hover:bg-line/[.04] transition-colors"
              >
                <td class="py-3 px-2">
                  <span class="font-mono text-fg bg-line/[.07] px-2 py-0.5 rounded text-xs">
                    {{ approval.version_tag }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="space-y-1.5">
                    <AppVersionStatusBadge :status="approval.status" />
                    <div v-if="approval.notes" class="flex items-start gap-1.5 max-w-xs">
                      <span class="text-xs font-medium text-fg-muted shrink-0 mt-px">{{ $t('AdminAppsView.notesLabel') }}</span>
                      <span class="text-xs text-fg-muted italic truncate" :title="approval.notes">{{ approval.notes }}</span>
                    </div>
                    <div v-if="approval.rejection_reason" class="flex items-start gap-1.5 max-w-xs">
                      <span class="text-xs font-medium text-danger shrink-0 mt-px">{{ $t('AdminAppsView.rejectionLabel') }}</span>
                      <span class="text-xs text-danger italic truncate" :title="approval.rejection_reason">{{ approval.rejection_reason }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 text-fg-muted text-xs">
                  {{ formatDate(approval.created_at) }}
                </td>
                <td class="py-3 px-2">
                  <div class="flex justify-end gap-2">

                    <!-- Pending: Approve + Reject -->
                    <template v-if="approval.status === 'pending'">
                      <button
                        @click="handleApprove(app.appId, approval.version_tag)"
                        :disabled="actingOn === `${app.appId}:${approval.version_tag}`"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-dot/10 text-success border border-success-dot/30 text-xs font-medium hover:bg-success-dot/10 transition-colors disabled:opacity-50"
                      >
                        <Check :size="13" />
                        {{ $t('AdminAppsView.approveBtn') }}
                      </button>
                      <button
                        @click="openRejectModal(app.appId, app.name, approval.version_tag)"
                        :disabled="actingOn === `${app.appId}:${approval.version_tag}`"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-dot/10 text-danger border border-danger-dot/30 text-xs font-medium hover:bg-danger-dot/10 transition-colors disabled:opacity-50"
                      >
                        <X :size="13" />
                        {{ $t('AdminAppsView.rejectBtn') }}
                      </button>
                    </template>

                    <!-- Approved: Revoke -->
                    <template v-else-if="approval.status === 'approved'">
                      <button
                        @click="openRevokeModal(app.appId, approval.version_tag)"
                        :disabled="actingOn === `${app.appId}:${approval.version_tag}`"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-line/[.07] text-fg-muted border border-subtle text-xs font-medium hover:bg-line/[.12] transition-colors disabled:opacity-50"
                      >
                        <RotateCcw :size="13" />
                        {{ $t('AdminAppsView.revokeBtn') }}
                      </button>
                    </template>

                    <!-- Rejected: Approve again -->
                    <template v-else-if="approval.status === 'rejected'">
                      <button
                        @click="handleApprove(app.appId, approval.version_tag)"
                        :disabled="actingOn === `${app.appId}:${approval.version_tag}`"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-dot/10 text-success border border-success-dot/30 text-xs font-medium hover:bg-success-dot/10 transition-colors disabled:opacity-50"
                      >
                        <Check :size="13" />
                        {{ $t('AdminAppsView.approveBtn') }}
                      </button>
                    </template>

                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>

        </div>
      </div>
      </div>
    </EntityListState>

    <ReasonModal
      v-model="rejectionReason"
      :show="showRejectModal"
      :title="$t('AdminAppsView.rejectModal.title')"
      :label="$t('AdminAppsView.rejectModal.reasonLabel')"
      :placeholder="$t('AdminAppsView.rejectModal.reasonPlaceholder')"
      :confirm-label="$t('AdminAppsView.rejectModal.submit')"
      variant="danger"
      required
      :busy="isRejecting"
      @close="showRejectModal = false"
      @confirm="handleReject"
    >
      <p class="text-sm text-fg-muted">
        <span class="font-mono bg-line/[.07] px-1.5 py-0.5 rounded text-xs">{{ rejectTarget?.versionTag }}</span>
        &nbsp;—&nbsp;{{ rejectTarget?.appName }}
      </p>
    </ReasonModal>

    <ReasonModal
      v-model="revokeReason"
      :show="showRevokeModal"
      :title="$t('AdminAppsView.revokeModal.title')"
      :label="$t('AdminAppsView.revokeModal.reasonLabel')"
      :placeholder="$t('AdminAppsView.revokeModal.reasonPlaceholder')"
      :confirm-label="$t('AdminAppsView.revokeModal.submit')"
      required
      :busy="isRevoking"
      @close="showRevokeModal = false"
      @confirm="handleRevoke"
    >
      <p class="text-sm text-fg-muted">
        <span class="font-mono bg-line/[.07] px-1.5 py-0.5 rounded text-xs">{{ revokeTarget?.versionTag }}</span>
      </p>
    </ReasonModal>

  </div>
</template>
