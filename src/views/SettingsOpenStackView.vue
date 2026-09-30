<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CheckCircle2,
  XCircle,
  CircleHelp,
  KeyRound,
  Trash2,
  RefreshCw,
  Upload,
} from 'lucide-vue-next'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { useToast } from '@/composables/useToast'
import CredentialMissingBanner from '@/components/CredentialMissingBanner.vue'
import TabBar from '@/components/ui/TabBar.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { parseCloudsYaml, CloudsYamlError } from '@/utils/clouds-yaml'
import { isInAppPath } from '@/utils/safe-redirect'
import { formatDateTime } from '@/utils/format'
import {
  buildCredentialPayload,
  emptyAppForm,
  emptyPasswordForm,
  formFromCloudsYaml,
  formFromStatus,
  type CredentialTab,
  type PasswordCredentialForm,
} from '@/services/openstack-credential-form.service'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const credStore = useOpenStackCredentialsStore()
const { t } = useI18n()

const activeTab = ref<CredentialTab>('app')
const formApp = reactive(emptyAppForm())
const formPwd = reactive(emptyPasswordForm())
const showDeleteModal = ref(false)

/** Switches to ``tab`` and writes ``fields`` into its form. */
const fillForm = ({ tab, fields }: { tab: CredentialTab; fields: Partial<PasswordCredentialForm> }) => {
  activeTab.value = tab
  Object.assign(tab === 'app' ? formApp : formPwd, fields)
}

// Credentials in use by an active deployment can't be changed. Warns and
// returns true when that is the case.
const refuseWhileLocked = () => {
  if (!credStore.isLocked) return false
  toast.warning(t('SettingsOpenStackView.errors.lockedActiveDeployments', { count: credStore.activeDeployments }))
  return true
}

const isDragging = ref(false)
const yamlInputRef = ref<HTMLInputElement | null>(null)

const lastValidated = computed(() => {
  if (!credStore.status?.last_validated_at) return null
  return formatDateTime(credStore.status.last_validated_at)
})

onMounted(async () => {
  await credStore.fetch()
  // Pre-fill the known non-secret fields if credentials exist.
  if (credStore.status?.has_credential) fillForm(formFromStatus(credStore.status))
})

const handleSave = async () => {
  if (refuseWhileLocked()) return
  const payload = buildCredentialPayload(activeTab.value, formApp, formPwd)
  if (!payload) {
    toast.error(t('SettingsOpenStackView.errors.missingFields'))
    return
  }
  try {
    await credStore.save(payload)
    if (credStore.lastError) {
      // Keep the secret in the form: the credentials were stored but don't
      // work, so the user will most likely correct and save them again.
      toast.warning(t('SettingsOpenStackView.errors.validationFailedSaved', { error: credStore.lastError }))
      return
    }
    toast.success(t('SettingsOpenStackView.toasts.saveSuccess'))
    maybeReturnToWizard()
    formApp.secret = ''
    formPwd.secret = ''
  } catch {
    // The store's error text can be empty — e.g. a 409 triggers a refetch
    // inside the store action, and that clears ``error`` again. Without a
    // fallback the failed save would stay completely invisible.
    toast.error(credStore.error || t('SettingsOpenStackView.errors.saveFailed'))
  }
}

const handleTest = async () => {
  try {
    await credStore.test()
    if (credStore.lastError) {
      toast.error(t('SettingsOpenStackView.errors.validationFailed', { error: credStore.lastError }))
    } else {
      toast.success(t('SettingsOpenStackView.toasts.credentialsValid'))
    }
  } catch {
    toast.error(credStore.error || t('SettingsOpenStackView.errors.testFailed'))
  }
}

const handleDelete = () => {
  if (refuseWhileLocked()) return
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  try {
    await credStore.remove()
    showDeleteModal.value = false
    toast.success(t('SettingsOpenStackView.status.deleteSuccess'))
    formApp.secret = ''
    formPwd.secret = ''
  } catch {
    showDeleteModal.value = false
    toast.error(credStore.error || t('SettingsOpenStackView.errors.deleteFailed'))
  }
}

const handleYamlFile = async (file: File) => {
  if (refuseWhileLocked()) return
  let text: string
  try {
    text = await file.text()
  } catch (err) {
    console.error('Failed to read clouds.yaml file:', err)
    toast.error(t('SettingsOpenStackView.fileReadError'))
    return
  }
  if (!text.trim()) {
    toast.error(t('SettingsOpenStackView.fileEmpty'))
    return
  }

  let parsed
  try {
    parsed = parseCloudsYaml(text)
  } catch (err) {
    console.error('clouds.yaml parse error:', err)
    const msg = err instanceof CloudsYamlError ? err.message : t('SettingsOpenStackView.cloudsYamlError')
    toast.error(msg)
    return
  }

  fillForm(formFromCloudsYaml(parsed))
  toast.success(t('SettingsOpenStackView.cloudsYamlImported'))
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  if (credStore.isLocked) return
  const file = event.dataTransfer?.files?.[0]
  if (!file) {
    toast.error(t('SettingsOpenStackView.dropNoFile'))
    return
  }
  handleYamlFile(file)
}

const onFilePick = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleYamlFile(file)
  input.value = ''
}

// Only follow ``next`` when it is an in-app path of a known route; otherwise
// the user simply stays on this page. Unknown paths end up on the catch-all
// 404 route, so that one doesn't count as known either.
const internalNextPath = (next: unknown): string | null => {
  if (!isInAppPath(next)) return null
  const resolved = router.resolve(next)
  if (resolved.matched.length === 0 || resolved.name === ROUTE_NAMES.notFound) return null
  return next
}

const maybeReturnToWizard = () => {
  const next = internalNextPath(route.query.next)
  if (next) router.push(next)
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <PageHeader :title="t('SettingsOpenStackView.title')" :subtitle="t('SettingsOpenStackView.intro')" />

    <!-- Lock banner -->
    <CredentialMissingBanner
      v-if="credStore.isLocked"
      variant="lock"
      :title="t('SettingsOpenStackView.lockBanner.title')"
      :message="t('SettingsOpenStackView.lockBanner.message', { count: credStore.activeDeployments })"
      :cta="t('SettingsOpenStackView.lockBanner.cta')"
      :ctaTo="{ name: ROUTE_NAMES.deploymentsList }"
      class="mb-6"
    />

    <!-- Status card -->
    <div class="bg-panel rounded-xl border p-5 mb-6">
      <div v-if="credStore.loading" class="text-fg-muted text-sm">
        {{ t('SettingsOpenStackView.status.loading') }}
      </div>
      <div v-else-if="!credStore.hasCredential" class="flex items-center gap-3">
        <CircleHelp class="text-icon" :size="22" />
        <div>
          <div class="font-medium text-fg">{{ t('SettingsOpenStackView.status.noneTitle') }}</div>
          <div class="text-sm text-fg-muted">
            <i18n-t keypath="SettingsOpenStackView.status.noneHint" tag="span">
              <template #file><code class="font-mono">clouds.yaml</code></template>
            </i18n-t>
          </div>
        </div>
      </div>
      <div v-else class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <CheckCircle2 v-if="credStore.isValidated && !credStore.lastError" class="text-success" :size="22" />
          <XCircle v-else class="text-danger" :size="22" />
          <div>
            <div class="font-medium text-fg">
              {{ credStore.isValidated && !credStore.lastError ? t('SettingsOpenStackView.status.valid') : t('SettingsOpenStackView.status.invalid') }}
            </div>
            <div class="text-sm text-fg-muted">
              <span v-if="lastValidated">{{ t('SettingsOpenStackView.status.lastChecked', { time: lastValidated }) }}</span>
              <span v-if="credStore.lastError" class="block text-danger">{{ credStore.lastError }}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-2 text-sm border rounded-md hover:bg-line/[.04] flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleTest"
            :disabled="credStore.loading"
          >
            <RefreshCw :size="16" /> {{ t('SettingsOpenStackView.status.retest') }}
          </button>
          <button
            class="px-3 py-2 text-sm border rounded-md text-danger border-danger-dot/30 hover:bg-danger-dot/10 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleDelete"
            :disabled="credStore.loading || credStore.isLocked"
            :title="credStore.isLocked ? t('SettingsOpenStackView.tooltips.lockedActiveDeployments') : ''"
          >
            <Trash2 :size="16" /> {{ t('SettingsOpenStackView.status.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- clouds.yaml drop zone -->
    <div
      class="border-2 border-dashed rounded-xl p-6 mb-6 transition-colors text-center"
      :class="[
        isDragging ? 'border-accent bg-accent/[.05]' : 'border-strong bg-panel',
        credStore.isLocked ? 'opacity-50 pointer-events-none' : ''
      ]"
      @dragenter.prevent.stop="!credStore.isLocked && (isDragging = true)"
      @dragover.prevent.stop="!credStore.isLocked && (isDragging = true)"
      @dragleave.prevent.stop="isDragging = false"
      @drop.prevent.stop="onDrop"
    >
      <Upload class="mx-auto text-icon mb-2" :size="28" />
      <div class="font-medium text-fg mb-1">{{ t('SettingsOpenStackView.dropZone.headline') }}</div>
      <div class="text-sm text-fg-muted mb-3">
        {{ t('SettingsOpenStackView.dropZone.orPrefix') }}
        <button
          class="text-accent-fg underline disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="credStore.isLocked"
          @click="yamlInputRef?.click()"
        >{{ t('SettingsOpenStackView.dropZone.pickFile') }}</button>
        {{ t('SettingsOpenStackView.dropZone.suffix') }}
      </div>
      <input
        ref="yamlInputRef"
        type="file"
        accept=".yaml,.yml,application/x-yaml,text/yaml"
        class="hidden"
        :disabled="credStore.isLocked"
        @change="onFilePick"
      />
    </div>

    <!-- Tabs -->
    <div class="bg-panel rounded-xl border">
      <TabBar
        v-model="activeTab"
        :tabs="[
          { key: 'app', label: t('SettingsOpenStackView.tabs.app') },
          { key: 'password', label: t('SettingsOpenStackView.tabs.password') },
        ]"
        fill
      >
        <template #extra="{ tab }">
          <span v-if="tab.key === 'app'" class="text-xs text-success">{{ t('SettingsOpenStackView.tabs.appRecommended') }}</span>
        </template>
      </TabBar>

      <!-- Application Credential -->
      <div v-if="activeTab === 'app'" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.authUrl') }}</label>
          <input
            v-model="formApp.auth_url"
            type="url"
            :placeholder="t('SettingsOpenStackView.placeholders.authUrl')"
            :disabled="credStore.isLocked"
            class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.region') }}</label>
          <input
            v-model="formApp.region_name"
            type="text"
            :placeholder="t('SettingsOpenStackView.placeholders.region')"
            :disabled="credStore.isLocked"
            class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.appCredentialId') }}</label>
          <input
            v-model="formApp.identifier"
            type="text"
            :disabled="credStore.isLocked"
            class="field w-full px-3 py-2 text-sm font-mono disabled:bg-line/[.04] disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.appCredentialSecret') }}</label>
          <input
            v-model="formApp.secret"
            type="password"
            :disabled="credStore.isLocked"
            class="field w-full px-3 py-2 text-sm font-mono disabled:bg-line/[.04] disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <!-- Password -->
      <div v-else class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.authUrl') }}</label>
          <input v-model="formPwd.auth_url" type="url" :disabled="credStore.isLocked" class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.region') }}</label>
            <input v-model="formPwd.region_name" type="text" :disabled="credStore.isLocked" class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed" />
          </div>
          <div>
            <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.userDomain') }}</label>
            <input v-model="formPwd.user_domain_name" type="text" :disabled="credStore.isLocked" class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed" />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.username') }}</label>
            <input v-model="formPwd.identifier" type="text" :disabled="credStore.isLocked" class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed" />
          </div>
          <div>
            <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.password') }}</label>
            <input v-model="formPwd.secret" type="password" :disabled="credStore.isLocked" class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed" />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.projectId') }}</label>
            <input v-model="formPwd.project_id" type="text" :disabled="credStore.isLocked" class="field w-full px-3 py-2 text-sm font-mono disabled:bg-line/[.04] disabled:cursor-not-allowed" />
          </div>
          <div>
            <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.projectName') }}</label>
            <input v-model="formPwd.project_name" type="text" :disabled="credStore.isLocked" class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-fg mb-1">{{ t('SettingsOpenStackView.fields.projectDomain') }}</label>
          <input v-model="formPwd.project_domain_name" type="text" :disabled="credStore.isLocked" class="field w-full px-3 py-2 text-sm disabled:bg-line/[.04] disabled:cursor-not-allowed" />
        </div>
      </div>

      <div class="px-6 pb-6 flex justify-end">
        <BaseButton
          size="sm"
          :disabled="credStore.loading || credStore.isLocked"
          :title="credStore.isLocked ? t('SettingsOpenStackView.tooltips.lockedActiveDeployments') : ''"
          @click="handleSave"
        >
          <KeyRound :size="16" />
          {{ t('SettingsOpenStackView.save') }}
        </BaseButton>
      </div>
    </div>

    <ConfirmModal
      :show="showDeleteModal"
      :busy="credStore.loading"
      :title="t('SettingsOpenStackView.confirmDeleteTitle')"
      :confirm-label="t('SettingsOpenStackView.status.delete')"
      :cancel-label="t('action.cancel')"
      @close="showDeleteModal = false"
      @confirm="confirmDelete"
    >
      <p class="text-fg">{{ t('SettingsOpenStackView.confirmDelete') }}</p>
    </ConfirmModal>
  </div>
</template>
