<script setup lang="ts">
/**
 * Wizard step "Aufgabe & Start": only what the app cannot do without — the
 * variables without a default and the files — with everything else, the
 * VM's size first, collapsed under "Erweiterte Einstellungen", and the
 * summary beside it. Variables sit in a grid. An app that needs
 * nothing shows just the summary; the step is still the last one.
 *
 * Why the start is blocked is reported up through ``reason``.
 */
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AlertBox from '@/components/ui/AlertBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Spinner from '@/components/ui/Spinner.vue'
import VariableFieldCard from '@/components/deployment-wizard/VariableFieldCard.vue'
import FileAssignment from '@/components/deployment-wizard/FileAssignment.vue'
import AdvancedSettings from '@/components/deployment-wizard/AdvancedSettings.vue'
import WizardSummaryPanel from '@/components/deployment-wizard/WizardSummaryPanel.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useStartStep } from '@/composables/useStartStep'
import { variableLabel } from '@/services/deployment-variables.service'
import type { BlockReason } from '@/composables/useDeploymentWizard'
import type { AppVariable } from '@/types'

const emit = defineEmits<{ reason: [reason: BlockReason | null] }>()

const { t } = useI18n()
const store = useDeploymentStore()
const { form, ready, sections, reason, load } = useStartStep()

const labelOf = (variable: AppVariable) => {
  const label = variableLabel(variable)
  return 'key' in label ? t(label.key) : label.text
}

// Only one variable's info is open at a time.
const activeTooltip = ref<string | null>(null)
const toggleTooltip = (name: string) => {
  activeTooltip.value = activeTooltip.value === name ? null : name
}

watch(reason, (value) => emit('reason', value), { immediate: true })

onMounted(load)
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--aside-w)]" data-testid="step-start">
    <div class="flex flex-col gap-6">
      <div v-if="!ready || form.isLoading.value" class="flex items-center gap-3 py-8 text-fg-muted">
        <Spinner />
        <span class="text-sm">{{ t('deployment.wizard.startStep.loading') }}</span>
      </div>

      <template v-else>
        <AlertBox v-if="form.loadFailed.value" tone="warning" :title="t('deployment.wizard.startStep.loadFailedTitle')">
          <p>{{ t('deployment.wizard.startStep.loadFailedText') }}</p>
          <BaseButton variant="secondary" size="sm" class="mt-2" @click="load">{{ t('deployment.wizard.app.retry') }}</BaseButton>
        </AlertBox>

        <AlertBox v-if="store.draft.filesLost" tone="info" data-testid="files-lost">
          {{ t('deployment.wizard.startStep.filesLost') }}
        </AlertBox>

        <section v-if="sections.required.length" class="flex flex-col gap-3" data-testid="required-inputs">
          <div class="flex flex-col gap-1">
            <h2 class="text-xl font-semibold text-heading">{{ t('deployment.wizard.startStep.requiredTitle') }}</h2>
            <p class="text-sm text-fg-muted">{{ t('deployment.wizard.startStep.requiredHint') }}</p>
          </div>
          <div class="wizard-variable-grid">
            <VariableFieldCard
              v-for="variable in sections.required"
              :key="variable.name"
              :variable="variable"
              :form="form"
              :label="labelOf(variable)"
              plain
              :tooltip-open="activeTooltip === variable.name"
              @toggle-tooltip="toggleTooltip(variable.name)"
            />
          </div>
        </section>

        <FileAssignment
          v-for="variable in sections.files"
          :key="variable.name"
          :variable="variable"
          :form="form"
          :label="labelOf(variable)"
        />

        <p
          v-if="!sections.required.length && !sections.files.length && !form.loadFailed.value"
          class="text-base text-fg-body"
          data-testid="nothing-needed"
        >
          {{ t('deployment.wizard.startStep.nothingNeeded') }}
        </p>

        <AdvancedSettings v-if="sections.advanced.length" :variables="sections.advanced" :form="form" :label-of="labelOf" />
      </template>
    </div>

    <WizardSummaryPanel />
  </div>
</template>
