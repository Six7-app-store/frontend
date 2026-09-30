<script setup lang="ts">
/**
 * Frame of every step of the deployment wizard: one card width, the
 * wizard title with the progress bar, an optional step heading, the step
 * content, and one footer with back, next and room for a status in
 * between (assignment progress, missing required fields).
 *
 * ``busy`` turns next into a spinner with ``busyLabel`` and disables it,
 * for the final deploy request.
 */
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight, BarChart3 } from 'lucide-vue-next'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'

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
  <div class="bg-panel rounded-2xl p-10 border shadow-sm max-w-7xl mx-auto w-full min-h-[700px] flex flex-col">
    <div class="flex items-center gap-3 mb-6">
      <h1 class="text-3xl font-semibold text-fg">{{ t('deployment.title') }}</h1>
      <BarChart3 :size="32" class="text-icon" />
    </div>

    <DeploymentProgressBar :current-step="step" />

    <div v-if="title" class="text-center mt-8">
      <h2 class="text-2xl font-semibold text-fg">{{ title }}</h2>
      <p v-if="subtitle" class="text-fg-muted mt-2">{{ subtitle }}</p>
    </div>

    <div class="flex-grow mt-8">
      <slot />
    </div>

    <div class="flex justify-between items-center gap-6 mt-8 pt-6 border-t border-subtle">
      <button
        type="button"
        data-testid="btn-back"
        class="btn-secondary flex items-center gap-2 px-8 py-2.5 rounded-control font-semibold transition"
        @click="$emit('back')"
      >
        <ArrowLeft :size="18" />
        {{ t('deployment.actions.back') }}
      </button>

      <div class="flex-1 min-w-0">
        <slot name="status" />
      </div>

      <button
        type="button"
        data-testid="btn-next"
        :disabled="nextDisabled || busy"
        class="btn-primary flex items-center gap-2 px-8 py-2.5 rounded-control font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        @click="$emit('next')"
      >
        <template v-if="busy">
          <span class="animate-spin rounded-full h-5 w-5 border-2 border-surface border-t-transparent"></span>
          {{ busyLabel }}
        </template>
        <template v-else>
          {{ nextLabel ?? t('deployment.actions.next') }}
          <ArrowRight :size="18" />
        </template>
      </button>
    </div>
  </div>
</template>
