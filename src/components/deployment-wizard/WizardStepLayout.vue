<script setup lang="ts">
/**
 * Frame of every step of the deployment wizard: the wizard title with the
 * stepper, an optional step heading, the step
 * content, and one footer with back, next and room for a status in
 * between (assignment progress, missing required fields).
 *
 * ``busy`` turns next into a spinner with ``busyLabel`` and disables it,
 * for the final deploy request.
 */
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-vue-next'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'

withDefaults(defineProps<{
  step: 1 | 2 | 3 | 4
  title?: string
  subtitle?: string
  nextLabel?: string
  nextDisabled?: boolean
  busy?: boolean
  busyLabel?: string
}>(), {
  title: undefined,
  subtitle: undefined,
  nextLabel: undefined,
  nextDisabled: false,
  busy: false,
  busyLabel: undefined,
})

defineEmits<{ back: []; next: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex max-w-page flex-col">
    <PageHeader :title="t('deployment.title')" />

    <DeploymentProgressBar :current-step="step" />

    <div v-if="title" class="mt-8">
      <h2 class="text-2xl font-semibold text-heading">{{ title }}</h2>
      <p v-if="subtitle" class="mt-1.5 text-base text-fg-muted">{{ subtitle }}</p>
    </div>

    <div class="mt-6 flex-grow">
      <slot />
    </div>

    <div class="mt-8 flex items-center justify-between gap-6 border-t border-subtle pt-6">
      <BaseButton variant="secondary" data-testid="btn-back" @click="$emit('back')">
        <ArrowLeft :size="16" aria-hidden="true" />
        {{ t('deployment.actions.back') }}
      </BaseButton>

      <div class="min-w-0 flex-1">
        <slot name="status" />
      </div>

      <BaseButton data-testid="btn-next" :disabled="nextDisabled || busy" @click="$emit('next')">
        <template v-if="busy">
          <Loader2 :size="16" class="animate-spin" aria-hidden="true" />
          {{ busyLabel }}
        </template>
        <template v-else>
          {{ nextLabel ?? t('deployment.actions.next') }}
          <ArrowRight :size="16" aria-hidden="true" />
        </template>
      </BaseButton>
    </div>
  </div>
</template>
