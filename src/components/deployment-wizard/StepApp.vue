<script setup lang="ts">
/**
 * Wizard step "App": approved apps as radio cards with a search, and the
 * version — the newest approved one preselected, every other one in a select.
 */
import { computed, onMounted, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle } from 'lucide-vue-next'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useWizardApp } from '@/composables/useWizardApp'
import { appTagline, isUnapproved } from '@/services/wizard-app.service'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import EntityListState from '@/components/ui/EntityListState.vue'
import FormField from '@/components/ui/FormField.vue'
import RadioCardGroup from '@/components/ui/RadioCardGroup.vue'
import type { RadioCardOption } from '@/components/ui/radio-card'

const { t } = useI18n()
const store = useDeploymentStore()
const { query, apps, appsState, chosen, versions, versionsState, loadApps, choose, chooseVersion, loadVersions } = useWizardApp()

const questionId = useId()
const searchId = useId()

const options = computed<RadioCardOption[]>(() => apps.value.map((app) => ({
  value: app.appId,
  label: app.name,
  description: [
    appTagline(app) || t('deployment.wizard.app.noDescription'),
    isUnapproved(app) ? t('deployment.wizard.app.notApproved') : '',
  ].filter(Boolean).join(' · '),
})))

const chosenId = computed<string | null>({
  get: () => store.draft.appId,
  set: (id) => {
    const app = apps.value.find((a) => a.appId === id)
    if (app) choose(app)
  },
})

const isNewest = computed(() => !!chosen.value && store.draft.releaseTag === chosen.value.latestApprovedVersion)

const version = computed({
  get: () => store.draft.releaseTag,
  set: (tag: string) => chooseVersion(tag),
})
// Without a list (the app reports none) the preselected version is still offered.
const versionChoices = computed(() => {
  const tags = versionsState.value === 'ready' ? versions.value : [store.draft.releaseTag].filter(Boolean)
  return tags.map((tag) => ({ value: tag, label: tag }))
})

// Also covers a draft restored with its app already chosen.
watch(() => store.draft.appId, (id) => { if (id) loadVersions() }, { immediate: true })
onMounted(loadApps)
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="step-app">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h2 :id="questionId" class="text-xl font-semibold text-heading">{{ t('deployment.wizard.app.question') }}</h2>
        <p class="text-sm text-fg-muted">{{ t('deployment.wizard.app.onlyApproved') }}</p>
      </div>
      <div>
        <label :for="searchId" class="sr-only">{{ t('deployment.wizard.app.search') }}</label>
        <input
          :id="searchId"
          v-model="query"
          type="search"
          class="field w-64 px-3"
          :placeholder="t('deployment.wizard.app.searchPlaceholder')"
          data-testid="app-search"
        />
      </div>
    </div>

    <EntityListState
      :is-loading="appsState === 'loading' || appsState === 'idle'"
      :is-error="appsState === 'error'"
      :error-message="t('deployment.wizard.app.loadError')"
      :is-empty="options.length === 0"
      :empty-message="query.trim() ? t('deployment.wizard.app.noMatch') : t('deployment.wizard.app.none')"
    >
      <template #error-action>
        <BaseButton variant="secondary" size="sm" @click="loadApps">{{ t('deployment.wizard.app.retry') }}</BaseButton>
      </template>
      <RadioCardGroup v-model="chosenId" :options="options" :labelledby="questionId" />
    </EntityListState>

    <div v-if="chosen" class="surface-panel flex flex-col gap-3 px-4 py-3.5" data-testid="version-panel">
      <p class="text-base">
        {{ t('deployment.wizard.app.version') }}
        <span class="font-mono text-fg" data-testid="chosen-version">{{ store.draft.releaseTag }}</span>
        <span class="text-sm text-fg-muted">
          · {{ isNewest ? t('deployment.wizard.app.newestApproved') : t('deployment.wizard.app.otherChosen') }}
        </span>
      </p>

      <p v-if="versionsState === 'loading'" class="text-sm text-fg-muted">{{ t('deployment.wizard.app.versionsLoading') }}</p>
      <p v-else-if="versionsState === 'error'" class="flex items-center gap-1.5 text-sm text-danger" role="alert">
        <AlertCircle :size="15" class="shrink-0" aria-hidden="true" />
        {{ t('deployment.wizard.app.versionsError') }}
      </p>
      <p v-else-if="versionChoices.length === 0" class="flex items-center gap-1.5 text-sm text-danger" role="alert" data-testid="no-versions">
        <AlertCircle :size="15" class="shrink-0" aria-hidden="true" />
        {{ t('deployment.wizard.app.noVersions') }}
      </p>
      <FormField v-else v-slot="{ id }" :label="t('deployment.wizard.app.versionLabel')" class="max-w-xs">
        <BaseSelect :id="id" v-model="version" :options="versionChoices" data-testid="version-select" />
      </FormField>
      <p v-if="isUnapproved(chosen)" class="text-sm text-fg-muted" data-testid="unapproved-hint">
        {{ t('deployment.wizard.app.unapprovedHint') }}
      </p>
    </div>
  </section>
</template>
