<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Inbox } from 'lucide-vue-next'
import ApprovalAccordionItem from '@/components/app/ApprovalAccordionItem.vue'
import ReasonModal from '@/components/ui/ReasonModal.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EntityListState from '@/components/ui/EntityListState.vue'
import { useAppApprovals } from '@/composables/useAppApprovals'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToast()

// ----------------------------------------------------------------
// State
// ----------------------------------------------------------------
const {
  apps, isLoading, pendingCount: pendingCountMap,
  approvals: approvalsMap, loading: loadingMap, onlyWithSubmissions, sortedApps,
  loadAll: loadQueue, loadApprovals, approve, reject, revoke,
} = useAppApprovals()
// which app is expanded
const expandedAppId = ref<string | null>(null)

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

const loadAll = async () => {
  try {
    await loadQueue()
  } catch {
    toast.error(t('AdminAppsView.loadError'))
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
    await approve(appId, versionTag)
    toast.success(t('AdminAppsView.approveSuccess'))
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

// Reject and revoke both need a target and a reason and close their modal
// on success; only the decision, the texts and the busy flag differ.
const submitRejection = async (params: {
  target: { appId: string; versionTag: string } | null
  reason: string
  decide: (appId: string, versionTag: string, reason: string) => Promise<void>
  busy: Ref<boolean>
  modal: Ref<boolean>
  successKey: string
  errorKey: string
}) => {
  if (!params.target || !params.reason.trim()) return
  params.busy.value = true
  try {
    await params.decide(params.target.appId, params.target.versionTag, params.reason.trim())
    toast.success(t(params.successKey))
    params.modal.value = false
  } catch {
    toast.error(t(params.errorKey))
  } finally {
    params.busy.value = false
  }
}

const handleReject = () => submitRejection({
  target: rejectTarget.value,
  reason: rejectionReason.value,
  decide: reject,
  busy: isRejecting,
  modal: showRejectModal,
  successKey: 'AdminAppsView.rejectSuccess',
  errorKey: 'AdminAppsView.rejectError',
})

const openRevokeModal = (appId: string, versionTag: string) => {
  revokeTarget.value = { appId, versionTag }
  revokeReason.value = ''
  showRevokeModal.value = true
}

const handleRevoke = () => submitRejection({
  target: revokeTarget.value,
  reason: revokeReason.value,
  decide: revoke,
  busy: isRevoking,
  modal: showRevokeModal,
  successKey: 'AdminAppsView.revokeSuccess',
  errorKey: 'AdminAppsView.revokeError',
})

onMounted(loadAll)
</script>

<template>
  <div class="max-w-page">

    <PageHeader :title="$t('AdminAppsView.title')" :subtitle="$t('AdminAppsView.subtitle')">
      <template #actions>
        <!-- Filter toggle as the page action (page-specific, so it's a slot
             rather than hard-wired). -->
        <div class="flex items-center gap-3 text-base">
          <span class="text-fg-body" aria-hidden="true">{{ $t('AdminAppsView.filterOnlySubmissions') }}</span>
          <ToggleSwitch v-model="onlyWithSubmissions" :label="$t('AdminAppsView.filterOnlySubmissions')" />
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
        class="surface-panel flex items-start gap-4 px-panel py-8"
      >
        <Inbox :size="18" class="mt-0.5 shrink-0 text-icon" aria-hidden="true" />
        <div class="flex flex-col gap-1">
          <h2 class="text-md font-semibold text-heading">{{ $t('AdminAppsView.emptyNoSubmissionsTitle') }}</h2>
          <p class="text-base text-fg-body">
            {{ $t('AdminAppsView.emptyNoSubmissionsDesc') }}
            <button type="button" class="link" @click="onlyWithSubmissions = false">
              {{ $t('AdminAppsView.emptyShowAll') }}
            </button>
          </p>
        </div>
      </div>

      <div v-else class="surface-panel divide-y divide-faint overflow-hidden">
      <ApprovalAccordionItem
        v-for="app in sortedApps"
        :key="app.appId"
        :app="app"
        :expanded="expandedAppId === app.appId"
        :pending-count="pendingCountMap[app.appId]"
        :approvals="approvalsMap[app.appId]"
        :loading="loadingMap[app.appId]"
        :acting-on="actingOn"
        @toggle="toggleApp(app.appId)"
        @approve="(tag) => handleApprove(app.appId, tag)"
        @reject="(tag) => openRejectModal(app.appId, app.name, tag)"
        @revoke="(tag) => openRevokeModal(app.appId, tag)" />
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
        <span class="code-chip">{{ rejectTarget?.versionTag }}</span>
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
        <span class="code-chip">{{ revokeTarget?.versionTag }}</span>
      </p>
    </ReasonModal>

  </div>
</template>
