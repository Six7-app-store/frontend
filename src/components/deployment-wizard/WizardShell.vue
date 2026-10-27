<script setup lang="ts">
/**
 * Frame of the deployment wizard, the same for every step and both entry
 * points: page title, stepper, the step, and one footer with back on the
 * left and the forward action on the right.
 *
 * While ``blockReason`` is set the forward button is disabled and the reason
 * stands next to it as text, not only as a tooltip. ``busy`` turns the
 * button into a spinner with ``busyLabel`` for the start request.
 */
import { useI18n } from 'vue-i18n'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import WizardStepper from '@/components/deployment-wizard/WizardStepper.vue'

withDefaults(defineProps<{
  labels: readonly string[]
  current: number
  backLabel: string
  nextLabel: string
  blockReason?: string | null
  busy?: boolean
  busyLabel?: string
  /** Hide the footer, e.g. while the wizard cannot be used at all. */
  hideFooter?: boolean
}>(), {
  blockReason: null,
  busy: false,
  busyLabel: undefined,
  hideFooter: false,
})

defineEmits<{ back: []; next: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex w-full flex-col gap-7">
    <PageHeader :title="t('deployment.title')" />

    <WizardStepper :labels="labels" :current="current" />

    <div>
      <slot />
    </div>

    <div v-if="!hideFooter" class="flex items-center justify-between gap-4 border-t border-subtle pt-5">
      <BaseButton variant="secondary" data-testid="btn-back" @click="$emit('back')">
        {{ backLabel }}
      </BaseButton>

      <div class="flex min-w-0 items-center gap-4">
        <p
          v-if="blockReason && !busy"
          class="flex min-w-0 items-center gap-1.5 text-sm text-fg-muted"
          aria-live="polite"
          data-testid="wizard-block-reason"
        >
          <AlertCircle :size="15" class="shrink-0 text-icon" aria-hidden="true" />
          <span>{{ blockReason }}</span>
        </p>
        <BaseButton
          data-testid="btn-next"
          :disabled="!!blockReason || busy"
          :disabled-reason="blockReason ?? undefined"
          @click="$emit('next')"
        >
          <template v-if="busy">
            <Loader2 :size="16" class="animate-spin" aria-hidden="true" />
            {{ busyLabel }}
          </template>
          <template v-else>{{ nextLabel }}</template>
        </BaseButton>
      </div>
    </div>
  </div>
</template>
