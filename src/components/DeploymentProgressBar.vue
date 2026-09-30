<script setup lang="ts">
/**
 * Stepper of the deployment wizard. Done steps carry a check, the current
 * step the accent ring (like the active nav item), later steps stay muted.
 * Green is kept for status, so it is not used here.
 */
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'

defineProps<{
  currentStep: number
}>()

const { t } = useI18n()

// 4 steps: config -> assignment -> variables -> summary
const steps = [
  { step: 1, key: 'deployment.steps.config' },
  { step: 2, key: 'deployment.steps.assignment' },
  { step: 3, key: 'deployment.steps.vars' },
  { step: 4, key: 'deployment.steps.summary' },
]
</script>

<template>
  <ol class="flex items-center gap-3" :aria-label="t('deployment.title')">
    <template v-for="(item, index) in steps" :key="item.step">
      <li
        class="flex shrink-0 items-center gap-2"
        :aria-current="currentStep === item.step ? 'step' : undefined"
        data-testid="wizard-step"
      >
        <span
          class="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold tabular-nums"
          :class="currentStep > item.step
            ? 'border-subtle bg-line/[.07] text-heading'
            : currentStep === item.step
              ? 'border-accent text-heading'
              : 'border-strong text-fg-muted'"
          aria-hidden="true"
        >
          <Check v-if="currentStep > item.step" :size="13" :stroke-width="2.5" />
          <template v-else>{{ item.step }}</template>
        </span>
        <span
          class="whitespace-nowrap text-sm"
          :class="currentStep === item.step ? 'font-semibold text-heading' : currentStep > item.step ? 'text-fg' : 'text-fg-muted'"
        >
          {{ t(item.key) }}
        </span>
      </li>
      <li v-if="index < steps.length - 1" class="h-px min-w-6 flex-1 bg-line/[.12]" aria-hidden="true" />
    </template>
  </ol>
</template>
