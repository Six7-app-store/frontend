<script setup lang="ts">
/**
 * "Erweiterte Einstellungen": every variable that has a default, collapsed
 * so nobody has to look at it, with plain labels ("Größe der VM") instead of
 * OpenTofu names when opened, laid out as a grid.
 */
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from 'lucide-vue-next'
import VariableFieldCard from '@/components/deployment-wizard/VariableFieldCard.vue'
import type { VariableForm } from '@/composables/useVariableForm'
import type { AppVariable } from '@/types'

defineProps<{
  variables: AppVariable[]
  form: VariableForm
  labelOf: (variable: AppVariable) => string
}>()

const { t } = useI18n()
const open = ref(false)
const panelId = useId()

// Only one variable's info is open at a time.
const activeTooltip = ref<string | null>(null)
const toggleTooltip = (name: string) => {
  activeTooltip.value = activeTooltip.value === name ? null : name
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <button
      type="button"
      class="surface-panel flex w-full items-center gap-3 px-4 py-3.5 text-left"
      :aria-expanded="open"
      :aria-controls="panelId"
      data-testid="btn-advanced"
      @click="open = !open"
    >
      <span class="min-w-0 flex-1 text-base font-semibold">{{ t('deployment.wizard.advanced.title') }}</span>
      <ChevronDown :size="18" class="shrink-0 text-icon transition-transform" :class="{ 'rotate-180': open }" aria-hidden="true" />
    </button>
    <div v-show="open" :id="panelId" class="wizard-variable-grid" data-testid="advanced-panel">
      <VariableFieldCard
        v-for="variable in variables"
        :key="variable.name"
        :variable="variable"
        :form="form"
        :label="labelOf(variable)"
        plain
        :tooltip-open="activeTooltip === variable.name"
        @toggle-tooltip="toggleTooltip(variable.name)"
      />
    </div>
  </div>
</template>
