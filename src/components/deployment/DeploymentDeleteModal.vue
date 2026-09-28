<script setup lang="ts">
/**
 * Confirmation dialog for deleting a deployment. The backend decides
 * whether the delete dispatches a destroy task or soft-deletes directly;
 * this dialog only asks for confirmation.
 */
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

defineProps<{
  show: boolean
  deploymentName: string
  busy?: boolean
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
    :title="$t('DeploymentDetailView.confirmDeleteTitle')"
    :confirm-label="$t('DeploymentDetailView.confirmButton')"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <i18n-t keypath="DeploymentDetailView.confirmDeleteMessage" tag="p" class="text-fg">
      <template #name><strong>{{ deploymentName }}</strong></template>
    </i18n-t>
  </ConfirmModal>
</template>
