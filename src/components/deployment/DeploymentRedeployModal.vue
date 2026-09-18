<script setup lang="ts">
/**
 * Confirmation dialog for redeploying a single VM. Shows the Terraform
 * state address so the user can sanity-check which instance is about to
 * be recreated.
 */
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'

defineProps<{
  show: boolean
  /** Terraform state address of the VM to redeploy. */
  address: string | null
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <Modal :show="show" @close="$emit('close')">
    <template #title>
      VM neu erstellen?
    </template>
    <template #body>
      <div class="space-y-3">
        <p class="text-gray-700">
          Diese VM wird zerstört und identisch neu erstellt.
          Andere VMs in diesem Deployment bleiben unangetastet.
        </p>
        <p v-if="address" class="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all">
          {{ address }}
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" @click="$emit('close')">
          {{ $t('DeploymentDetailView.cancelButton') }}
        </BaseButton>
        <BaseButton variant="red" @click="$emit('confirm')">
          Redeploy
        </BaseButton>
      </div>
    </template>
  </Modal>
</template>
