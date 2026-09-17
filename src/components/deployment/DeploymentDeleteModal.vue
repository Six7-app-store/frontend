<script setup lang="ts">
/**
 * Confirmation dialog for deleting a deployment. The backend decides
 * whether the delete dispatches a destroy task or soft-deletes directly;
 * this dialog only asks for confirmation.
 */
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'

defineProps<{
  show: boolean
  deploymentName: string
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <Modal :show="show" @close="$emit('close')">
    <template #title>
      {{ $t('DeploymentDetailView.confirmDeleteTitle') }}
    </template>
    <template #body>
      <p class="text-gray-700" v-html="$t('DeploymentDetailView.confirmDeleteMessage', { name: deploymentName })"></p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" @click="$emit('close')">
          {{ $t('DeploymentDetailView.cancelButton') }}
        </BaseButton>
        <BaseButton variant="red" @click="$emit('confirm')">
          {{ $t('DeploymentDetailView.confirmButton') }}
        </BaseButton>
      </div>
    </template>
  </Modal>
</template>
