<script setup lang="ts">
/**
 * Stepper of the deployment wizard: "Schritt x von y" and one entry per
 * step. Done steps carry a check, the current one the filled accent circle
 * and ``aria-current="step"``, later ones stay outlined and muted.
 */
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'

defineProps<{
  /** Step labels in order. */
  labels: readonly string[]
  /** Index of the current step, from 0. */
  current: number
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm text-fg-muted" data-testid="wizard-step-count">
      {{ t('deployment.wizard.stepOf', { current: current + 1, total: labels.length }) }}
    </span>
    <ol class="flex items-center gap-4" :aria-label="t('deployment.wizard.progress')">
      <template v-for="(label, index) in labels" :key="label">
        <li
          class="flex shrink-0 items-center gap-2.5 text-base"
          :class="index === current ? 'font-semibold text-heading' : index < current ? 'text-nav' : 'text-fg-muted'"
          :aria-current="index === current ? 'step' : undefined"
          data-testid="wizard-step"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold tabular-nums"
            :class="index === current
              ? 'bg-accent text-on-accent'
              : index < current
                ? 'border border-strong bg-line/[.10] text-heading'
                : 'border-[1.5px] border-strong text-fg-muted'"
            aria-hidden="true"
          >
            <Check v-if="index < current" :size="14" :stroke-width="2.5" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="whitespace-nowrap" data-testid="wizard-step-label">
            {{ label }}<span v-if="index < current" class="sr-only"> ({{ t('deployment.wizard.stepDone') }})</span>
          </span>
        </li>
        <li v-if="index < labels.length - 1" class="h-px min-w-10 flex-1 bg-line/[.14]" aria-hidden="true" />
      </template>
    </ol>
  </div>
</template>
