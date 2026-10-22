<script setup lang="ts">
/**
 * Confirmation dialog for hard-rebooting a single VM. Shows the OpenTofu
 * state address so the user can sanity-check which instance is about to
 * be restarted.
 */
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

defineProps<{
  show: boolean
  /** OpenTofu state address of the VM to reboot. */
  address: string | null
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <ConfirmModal
    :show="show"
    :title="$t('DeploymentDetailView.rebootModal.title')"
    :confirm-label="$t('DeploymentDetailView.rebootModal.confirm')"
    variant="primary"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <div class="flex flex-col gap-3">
      <p class="text-fg">{{ $t('DeploymentDetailView.rebootModal.text') }}</p>
      <p v-if="address" data-testid="reboot-address" class="code-chip block break-all px-3 py-2 text-xs">{{ address }}</p>
    </div>
  </ConfirmModal>
</template>
