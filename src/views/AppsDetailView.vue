<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppDetail } from '@/composables/useAppDetail'
import { useBreadcrumbEntity } from '@/composables/useBreadcrumbs'
import { useToast } from '@/composables/useToast'
import { getErrorDetail, getErrorDetailMessage, getErrorStatus } from '@/utils/http-error'
import { useI18n } from 'vue-i18n'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { useAuthStore } from '@/stores/auth.store'
import { useRole } from '@/composables/useRole'
import {
  appBannerStatus,
  appDetailLocation,
  appDetailTabs,
  appStatus,
  requestedAppDetailTab,
  versionOptions as versionTags,
  type AppDetailTab,
} from '@/services/app-presentation.service'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import TabBar from '@/components/ui/TabBar.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { provideCopyToClipboard } from '@/composables/useCopyToClipboard'
import { panelId, tabId, type Tab } from '@/components/ui/tab'
import AppDetailHeader from '@/components/app/AppDetailHeader.vue'
import AppOverviewTab from '@/components/app/AppOverviewTab.vue'
import AppDeploySidebar from '@/components/app/AppDeploySidebar.vue'
import AppDocsTab from '@/components/app/AppDocsTab.vue'
import AppConfigTab from '@/components/app/AppConfigTab.vue'
import AppVersionsTab from '@/components/app/AppVersionsTab.vue'
import AppSettingsTab from '@/components/app/AppSettingsTab.vue'
import AppEditModal from '@/components/app/AppEditModal.vue'
import SubmitVersionModal from '@/components/app/SubmitVersionModal.vue'
import type { AppUpdate, AppVersionApproval, AppVariableMarkerError } from '@/types'

const deploymentStore = useDeploymentStore()
const credStore = useOpenStackCredentialsStore()
const authStore = useAuthStore()
const { isAdmin } = useRole()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const appId = computed(() => route.params.id as string)
const {
  app, approvals, isLoading, variables, variablesState,
  load, loadApprovals, loadVariables, submitVersion, withdrawVersion: withdraw, setPrivate, update, remove,
} = useAppDetail(appId)
useBreadcrumbEntity(() => app.value?.name)
provideCopyToClipboard()

const TAB_IDS = 'app-detail'

const selectedVersion = ref('')

const showDeleteModal = ref(false)
const isDeleting = ref(false)
const showEditModal = ref(false)
const isSavingEdit = ref(false)
const withdrawingVersion = ref<string | null>(null)
const withdrawTarget = ref<string | null>(null)
const isTogglingPrivacy = ref(false)

const showSubmitModal = ref(false)
const submitTargetVersion = ref<string | null>(null)
const submitNotes = ref('')
const isSubmitting = ref(false)
const submitMarkerErrors = ref<AppVariableMarkerError[]>([])

// ----------------------------------------------------------------
// Permissions
// ----------------------------------------------------------------
const isOwner = computed(() =>
  !!app.value && String(app.value.userId) === String(authStore.userId)
)

// Editing, deleting and managing versions is "owner or admin". Mirrors the
// backend ``capabilities.can_edit_app`` so the UI doesn't offer actions that would 403.
const canEditApp = computed(() =>
  !!app.value && (isAdmin.value || isOwner.value)
)

// ----------------------------------------------------------------
// Versions and store state
// ----------------------------------------------------------------
const bannerStatus = computed(() => appBannerStatus(app.value, approvals.value))
const status = computed(() => appStatus(app.value, approvals.value, canEditApp.value))
const versionOptions = computed(() => versionTags(app.value?.versions))
// The configuration shows the variables of the newest version.
const currentVersion = computed(() => versionOptions.value[0] ?? '')
const approvalByVersion = computed(() => {
  const map: Record<string, AppVersionApproval> = {}
  for (const a of approvals.value) map[a.version_tag] = a
  return map
})

// ----------------------------------------------------------------
// Tabs: one URL each, a tab without content is left out
// ----------------------------------------------------------------
const requestedTab = computed(() => requestedAppDetailTab(route.params.tab))
const variablesPending = computed(() =>
  currentVersion.value !== '' && (variablesState.value === 'idle' || variablesState.value === 'loading'),
)

const availableTabs = computed<AppDetailTab[]>(() => appDetailTabs({
  hasDescription: Boolean(app.value?.description?.trim()),
  // While the variables are still coming, a link straight to the configuration waits for them.
  hasVariables: variables.value.length > 0 || (requestedTab.value === 'config' && variablesPending.value),
  hasVersions: versionOptions.value.length > 0,
  canEdit: canEditApp.value,
}))

const activeTab = computed<AppDetailTab>(() =>
  availableTabs.value.includes(requestedTab.value) ? requestedTab.value : 'overview',
)

const tabs = computed<Tab<AppDetailTab>[]>(() =>
  availableTabs.value.map((key) => ({ key, label: t(`AppsDetailView.tabs.${key}`) })),
)

const tabLink = (tab: AppDetailTab) =>
  availableTabs.value.includes(tab) ? appDetailLocation(appId.value, tab) : null

const selectTab = (tab: AppDetailTab) => {
  router.replace(appDetailLocation(appId.value, tab))
}

// A tab this app or user doesn't have (no rights, no variables, typo'd link)
// falls back to the overview, and the URL says so. Only a failed load of the
// variables is worth a word; a missing tab is not an error.
watch([app, activeTab, requestedTab], () => {
  if (!app.value || activeTab.value === requestedTab.value) return
  if (requestedTab.value === 'config' && variablesState.value === 'error') {
    toast.error(t('AppsDetailView.toasts.variablesError'))
  }
  selectTab('overview')
})

// ----------------------------------------------------------------
// Actions
// ----------------------------------------------------------------
const fetchAppDetails = async () => {
  try {
    await load()
    if (versionOptions.value.length > 0 && !selectedVersion.value) {
      selectedVersion.value = versionOptions.value[0]!
    }
  } catch {
    toast.error(t('AppsDetailView.toasts.loadError'))
    if (!app.value) router.push({ name: ROUTE_NAMES.apps })
  }
}

const handleDeploy = () => {
  if (!selectedVersion.value) {
    toast.warning(t('AppsDetailView.toasts.selectVersionFirst'))
    return
  }
  deploymentStore.resetDraft()
  deploymentStore.draft.appId = app.value.appId
  deploymentStore.draft.releaseTag = selectedVersion.value
  toast.success(t('AppsDetailView.toasts.preparingConfig', { name: app.value.name }))
  router.push({ name: ROUTE_NAMES.deploymentConfig })
}

const openSubmitModal = (versionTag: string) => {
  submitTargetVersion.value = versionTag
  submitNotes.value = ''
  submitMarkerErrors.value = []
  showSubmitModal.value = true
}

const confirmSubmit = async () => {
  if (!submitTargetVersion.value) return
  isSubmitting.value = true
  try {
    await submitVersion(submitTargetVersion.value, submitNotes.value.trim() || undefined)
    toast.success(t('AppsDetailView.toasts.submitSuccess'))
    showSubmitModal.value = false
  } catch (err: any) {
    const s = getErrorStatus(err)
    if (s === 409) {
      toast.warning(t('AppsDetailView.toasts.submitDuplicate'))
    } else if (s === 422) {
      const detail = getErrorDetail(err) as any
      if (detail?.marker_errors?.length) {
        submitMarkerErrors.value = detail.marker_errors
      } else {
        toast.error(t('AppsDetailView.toasts.submitError'))
      }
    } else {
      toast.error(t('AppsDetailView.toasts.submitError'))
    }
  } finally {
    isSubmitting.value = false
  }
}

// Withdrawing takes a version out of the admins' review list, so it is confirmed first.
const askWithdraw = (versionTag: string) => {
  withdrawTarget.value = versionTag
}

const confirmWithdraw = async () => {
  const versionTag = withdrawTarget.value
  if (!versionTag) return
  withdrawingVersion.value = versionTag
  try {
    await withdraw(versionTag)
    toast.success(t('AppsDetailView.toasts.withdrawSuccess'))
    withdrawTarget.value = null
  } catch {
    toast.error(t('AppsDetailView.toasts.withdrawError'))
  } finally {
    withdrawingVersion.value = null
  }
}

const togglePrivacy = async () => {
  if (!app.value) return
  isTogglingPrivacy.value = true
  try {
    await setPrivate(!app.value.is_private)
    toast.success(app.value.is_private
      ? t('AppsDetailView.toasts.setPrivate')
      : t('AppsDetailView.toasts.setPublic')
    )
  } catch {
    toast.error(t('AppsDetailView.toasts.updateError'))
  } finally {
    isTogglingPrivacy.value = false
  }
}

const submitEdit = async (changes: AppUpdate) => {
  isSavingEdit.value = true
  try {
    await update(changes)
    toast.success(t('AppsDetailView.toasts.editSuccess'))
    showEditModal.value = false
  } catch {
    toast.error(t('AppsDetailView.toasts.editError'))
  } finally {
    isSavingEdit.value = false
  }
}

const confirmDelete = async () => {
  if (!app.value) return
  isDeleting.value = true
  try {
    await remove()
    toast.success(t('AppsDetailView.deleteSuccessToast'))
    showDeleteModal.value = false
    router.push({ name: ROUTE_NAMES.apps })
  } catch (error) {
    const reason = getErrorDetailMessage(error)
    toast.error(`${t('AppsDetailView.deleteErrorToast')}${reason ? ': ' + reason : ''}`)
  } finally {
    isDeleting.value = false
  }
}

onMounted(async () => {
  await fetchAppDetails()
  // Reading the variables clones the repository; the page doesn't wait for it.
  if (currentVersion.value) void loadVariables(currentVersion.value)
  if (canEditApp.value) await loadApprovals()
})
</script>

<template>
  <div class="max-w-detail">
    <div v-if="isLoading" class="flex flex-col items-center gap-3 py-20">
      <Spinner />
      <p class="text-fg-muted">{{ $t('AppsDetailView.loading') }}</p>
    </div>

    <template v-else-if="app">
      <AppDetailHeader :app="app" :status="status" />

      <TabBar
        :model-value="activeTab"
        :tabs="tabs"
        :id-prefix="TAB_IDS"
        class="mb-section"
        @update:model-value="selectTab"
      >
        <template #extra="{ tab }">
          <!-- The owner still has something to do in the review. -->
          <span
            v-if="tab.key === 'versions' && canEditApp && (bannerStatus === 'no_submission' || bannerStatus === 'pending')"
            class="h-2 w-2 rounded-full bg-warning-dot"
            data-testid="versions-hint"
          />
        </template>
      </TabBar>

      <div :id="panelId(TAB_IDS, activeTab)" role="tabpanel" :aria-labelledby="tabId(TAB_IDS, activeTab)">
        <AppOverviewTab
          v-if="activeTab === 'overview'"
          :app="app"
          :current-version="currentVersion"
          :docs-to="tabLink('docs')"
          :config-to="tabLink('config')"
        >
          <template #deploy>
            <AppDeploySidebar
              v-model:selected-version="selectedVersion"
              :version-options="versionOptions"
              :credentials-missing="credStore.isResolved && !credStore.hasCredential"
              @deploy="handleDeploy" />
          </template>
        </AppOverviewTab>

        <AppDocsTab v-else-if="activeTab === 'docs'" :description="app.description" />

        <AppConfigTab
          v-else-if="activeTab === 'config'"
          :variables="variables"
          :version="currentVersion"
          :loading="variablesPending" />

        <AppVersionsTab
          v-else-if="activeTab === 'versions'"
          :versions="app.versions"
          :approval-by-version="approvalByVersion"
          :banner-status="bannerStatus"
          :can-edit="canEditApp"
          :is-private="Boolean(app.is_private)"
          :withdrawing-version="withdrawingVersion"
          @submit="openSubmitModal"
          @withdraw="askWithdraw" />

        <AppSettingsTab
          v-else-if="activeTab === 'settings'"
          :app="app"
          :toggling-privacy="isTogglingPrivacy"
          @toggle-privacy="togglePrivacy"
          @edit="showEditModal = true"
          @delete="showDeleteModal = true" />
      </div>
    </template>

    <!-- Delete modal -->
    <ConfirmModal
      v-if="app"
      :show="showDeleteModal"
      :busy="isDeleting"
      :title="$t('AppsDetailView.confirmDeleteTitle')"
      :confirm-label="$t('AppsDetailView.confirmButton')"
      :busy-label="$t('AppsDetailView.deletingButton')"
      @close="showDeleteModal = false"
      @confirm="confirmDelete"
    >
      <i18n-t keypath="AppsDetailView.confirmDeleteMessage" tag="p" class="text-fg">
        <template #name><strong>{{ app.name }}</strong></template>
      </i18n-t>
    </ConfirmModal>

    <ConfirmModal
      :show="withdrawTarget !== null"
      :busy="withdrawingVersion !== null"
      :title="$t('AppsDetailView.withdrawConfirmTitle')"
      :confirm-label="$t('AppsDetailView.withdrawButton')"
      :busy-label="$t('AppsDetailView.withdrawingButton')"
      @close="withdrawTarget = null"
      @confirm="confirmWithdraw"
    >
      <p class="text-fg">{{ $t('AppsDetailView.withdrawConfirmMessage', { version: withdrawTarget }) }}</p>
    </ConfirmModal>

    <AppEditModal
      v-if="app"
      :show="showEditModal"
      :app="app"
      :saving="isSavingEdit"
      @close="showEditModal = false"
      @invalid="toast.error(t('AppsDetailView.toasts.nameRequired'))"
      @save="submitEdit" />

    <SubmitVersionModal
      v-model:notes="submitNotes"
      :show="showSubmitModal"
      :version-tag="submitTargetVersion"
      :busy="isSubmitting"
      :marker-errors="submitMarkerErrors"
      @close="showSubmitModal = false"
      @confirm="confirmSubmit" />

  </div>
</template>
