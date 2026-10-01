<script setup lang="ts">
/**
 * Confirmation dialog for pausing or resuming a deployment. Title, body
 * and confirm button switch on ``action`` so there is one dialog instead
 * of two near-identical ones.
 */
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import type { PauseResumeAction } from '@/services/deployment-lifecycle.service'

defineProps<{
  show: boolean
  action: PauseResumeAction | null
  deploymentName: string
  /** Disables the dialog while the request is in flight. */
  busy: boolean
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <ConfirmModal
    :show="show"
    :busy="busy"
    :variant="action === 'pause' ? 'primary' : 'secondary'"
    :title="action === 'pause'
      ? $t('DeploymentDetailView.confirmPauseTitle')
      : $t('DeploymentDetailView.confirmResumeTitle')"
    :confirm-label="action === 'pause'
      ? $t('DeploymentDetailView.deploymentPause')
      : $t('DeploymentDetailView.deploymentResume')"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <i18n-t
      :keypath="action === 'pause'
        ? 'DeploymentDetailView.confirmPauseMessage'
        : 'DeploymentDetailView.confirmResumeMessage'"
      tag="p"
      class="text-fg"
    >
      <template #name><strong>{{ deploymentName }}</strong></template>
    </i18n-t>
  </ConfirmModal>
</template>
