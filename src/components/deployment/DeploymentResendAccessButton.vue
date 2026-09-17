<script setup lang="ts">
/**
 * "Resend access" button of one team member: shows the send state
 * (sending / sent / error) and is disabled while sending or while the
 * deployment is busy. The request itself is handled by the caller
 * (``useResendAccess``).
 */
import { AlertCircle, Check, Loader2, Send } from 'lucide-vue-next'
import type { ResendState } from '@/composables/useResendAccess'

defineProps<{
  state: ResendState | undefined
  /** Deployment still moving — sending is not possible yet. */
  busy: boolean
}>()

defineEmits<{
  (e: 'resend'): void
}>()
</script>

<template>
  <button
    @click="$emit('resend')"
    :disabled="state === 'sending' || busy"
    :title="busy
      ? $t('DeploymentDetailView.resendAccessBusyTooltip')
      : $t('DeploymentDetailView.resendAccessTooltip')"
    class="w-full lg:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
    :class="state === 'sent'
      ? 'bg-green-600 text-white border-green-600'
      : state === 'error'
        ? 'bg-red-50 text-red-700 border-red-300'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50'">
    <Loader2 v-if="state === 'sending'" :size="14"
      class="animate-spin" />
    <Check v-else-if="state === 'sent'" :size="14" />
    <AlertCircle v-else-if="state === 'error'" :size="14" />
    <Send v-else :size="14" />
    <span>
      {{ state === 'sending'
        ? $t('DeploymentDetailView.resendAccessSending')
        : state === 'sent'
          ? $t('DeploymentDetailView.resendAccessSent')
          : state === 'error'
            ? $t('DeploymentDetailView.resendAccessRetry')
            : $t('DeploymentDetailView.resendAccessButton') }}
    </span>
  </button>
</template>
