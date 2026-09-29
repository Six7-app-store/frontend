<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppDetail } from '@/composables/useAppDetail'
import { useToast } from '@/composables/useToast'
import { getErrorDetail, getErrorDetailMessage, getErrorStatus } from '@/utils/http-error'
import { useI18n } from 'vue-i18n'
import { Layers, ShoppingBag } from 'lucide-vue-next'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { useAuthStore } from '@/stores/auth.store'
import { useRole } from '@/composables/useRole'
import {
  appBannerStatus,
  findVersion,
  versionInfo as describeVersion,
  versionOptions as versionTags,
} from '@/services/app-presentation.service'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import TabBar from '@/components/ui/TabBar.vue'
import BackLink from '@/components/ui/BackLink.vue'
import Spinner from '@/components/ui/Spinner.vue'
import type { Tab } from '@/components/ui/tab'
import AppDetailHeader from '@/components/app/AppDetailHeader.vue'
import AppOverviewTab from '@/components/app/AppOverviewTab.vue'
import AppDeploySidebar from '@/components/app/AppDeploySidebar.vue'
import AppStoreTab from '@/components/app/AppStoreTab.vue'
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
  app, approvals, isLoading,
  load, loadApprovals, submitVersion, withdrawVersion: withdraw, setPrivate, update, remove,
} = useAppDetail(appId)

const selectedVersion = ref('')
const activeTab = ref<'overview' | 'store'>('overview')

const showDeleteModal = ref(false)
const isDeleting = ref(false)
const showEditModal = ref(false)
const isSavingEdit = ref(false)
const withdrawingVersion = ref<string | null>(null)
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

// The store tab (submissions, visibility) is only for those who may edit the app.
const tabs = computed(() => {
  const all: Tab<'overview' | 'store'>[] = [
    { key: 'overview', label: t('AppsDetailView.tabOverview'), icon: Layers },
    { key: 'store', label: t('AppsDetailView.tabStore'), icon: ShoppingBag },
  ]
  return canEditApp.value ? all : all.filter((tab) => tab.key !== 'store')
})

// ----------------------------------------------------------------
// Versions and store state
// ----------------------------------------------------------------
const bannerStatus = computed(() => appBannerStatus(app.value, approvals.value))
const versionOptions = computed(() => versionTags(app.value?.versions))
const versionInfo = computed(() => describeVersion(findVersion(app.value?.versions, selectedVersion.value)))
const approvalByVersion = computed(() => {
  const map: Record<string, AppVersionApproval> = {}
  for (const a of approvals.value) map[a.version_tag] = a
  return map
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

const withdrawVersion = async (versionTag: string) => {
  withdrawingVersion.value = versionTag
  try {
    await withdraw(versionTag)
    toast.success(t('AppsDetailView.toasts.withdrawSuccess'))
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
  if (canEditApp.value) await loadApprovals()
})
</script>

<template>
  <div class="bg-panel rounded-2xl p-10 border min-h-[600px]">

    <!-- Back -->
    <div class="mb-6">
      <BackLink :label="$t('AppsDetailView.backToOverview')" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <Spinner />
        <div class="text-fg-muted">{{ $t('AppsDetailView.loading') }}</div>
      </div>
    </div>

    <div v-else-if="app" class="max-w-4xl mx-auto">

      <AppDetailHeader :app="app" :can-edit="canEditApp" @edit="showEditModal = true" @delete="showDeleteModal = true" />

      <TabBar v-model="activeTab" :tabs="tabs" class="mb-8">
        <template #extra="{ tab }">
          <!-- dot if action needed -->
          <span
            v-if="tab.key === 'store' && (bannerStatus === 'no_submission' || bannerStatus === 'pending')"
            class="w-2 h-2 rounded-full bg-warning-dot"
          />
        </template>
      </TabBar>

      <!-- ============================================================ -->
      <!-- TAB 1: OVERVIEW                                               -->
      <!-- ============================================================ -->
      <div v-if="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-3 gap-12">

        <AppOverviewTab :app="app" :version-info="versionInfo" />

        <AppDeploySidebar
          v-model:selected-version="selectedVersion"
          :version-options="versionOptions"
          :credentials-missing="credStore.isResolved && !credStore.hasCredential"
          @deploy="handleDeploy" />

      </div>

      <!-- ============================================================ -->
      <!-- TAB 2: APP STORE                                              -->
      <!-- ============================================================ -->
      <AppStoreTab
        v-else-if="activeTab === 'store'"
        :app="app"
        :banner-status="bannerStatus"
        :version-options="versionOptions"
        :approval-by-version="approvalByVersion"
        :is-owner="isOwner"
        :withdrawing-version="withdrawingVersion"
        :toggling-privacy="isTogglingPrivacy"
        @toggle-privacy="togglePrivacy"
        @submit="openSubmitModal"
        @withdraw="withdrawVersion" />

    </div>

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
