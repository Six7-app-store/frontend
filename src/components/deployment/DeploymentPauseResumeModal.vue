<script setup lang="ts">
/**
 * Confirmation dialog for pausing or resuming a deployment. Title, body
 * and confirm button switch on ``action`` so there is one dialog instead
 * of two near-identical ones.
 */
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import type { PauseResumeAction } from '@/services/deployment-lifecycle.service'

defineProps<{
  show: boolean
  action: PauseResumeAction | null
  deploymentName: string
  /** Disables the confirm button while the request is in flight. */
  busy: boolean
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <Modal :show="show" @close="$emit('close')">
    <template #title>
      {{ action === 'pause'
        ? $t('DeploymentDetailView.confirmPauseTitle')
        : $t('DeploymentDetailView.confirmResumeTitle') }}
    </template>
    <template #body>
      <i18n-t
        :keypath="action === 'pause'
          ? 'DeploymentDetailView.confirmPauseMessage'
          : 'DeploymentDetailView.confirmResumeMessage'"
        tag="p"
        class="text-gray-700"
      >
        <template #name><strong>{{ deploymentName }}</strong></template>
      </i18n-t>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" @click="$emit('close')">
          {{ $t('DeploymentDetailView.cancelButton') }}
        </BaseButton>
        <BaseButton
          :variant="action === 'pause' ? 'yellow' : 'green'"
          @click="$emit('confirm')"
          :disabled="busy">
          {{ action === 'pause'
            ? $t('DeploymentDetailView.deploymentPause')
            : $t('DeploymentDetailView.deploymentResume') }}
        </BaseButton>
      </div>
    </template>
  </Modal>
</template>
