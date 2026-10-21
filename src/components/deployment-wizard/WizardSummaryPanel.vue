<script setup lang="ts">
/**
 * The start step's summary beside the inputs: app and version, for whom,
 * the split and what it leads to, how long it may take, and — as
 * information only — how many VMs the user's quota still has free.
 */
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import InfoList, { type InfoItem } from '@/components/ui/InfoList.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useQuotas } from '@/composables/useQuotas'
import { splitResult } from '@/services/team-assignment.service'
import { wizardTeams } from '@/services/deployment-draft.service'

const { t } = useI18n()
const store = useDeploymentStore()
const { quotas, fetchQuotas } = useQuotas()

const result = computed(() => {
  const draft = store.draft
  const outcome = splitResult(draft.groupMode, draft.studentIds.length, draft.groupMode === 'custom' ? wizardTeams(draft).length : null)
  return outcome ? t(outcome.key, { n: outcome.n }, outcome.n) : ''
})

const items = computed<InfoItem[]>(() => [
  { label: t('deployment.wizard.summary.app'), value: [store.draft.appName, store.draft.releaseTag].filter(Boolean).join(' · ') },
  { label: t('deployment.wizard.summary.target'), value: store.draft.targetLabel },
  { label: t('deployment.wizard.summary.split'), value: t(`deployment.wizard.split.${store.draft.groupMode}`) },
  { label: t('deployment.wizard.summary.result'), value: result.value },
  { label: t('deployment.wizard.summary.duration'), value: t('deployment.wizard.summary.durationHint') },
])

const freeVms = computed(() => quotas.value?.compute?.instances ?? null)

onMounted(() => { fetchQuotas() })
</script>

<template>
  <aside class="surface-panel flex flex-col gap-3.5 p-5" data-testid="wizard-summary">
    <h2 class="text-md font-semibold text-heading">{{ t('deployment.wizard.summary.title') }}</h2>
    <InfoList :items="items" />
    <p v-if="freeVms" class="text-xs text-fg-muted" data-testid="free-quota">
      {{ t('deployment.wizard.summary.freeQuota', { free: freeVms.available, limit: freeVms.limit }) }}
    </p>
  </aside>
</template>
