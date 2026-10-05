<script setup lang="ts">
/**
 * Confirmation dialog for redeploying a single VM. Shows the OpenTofu
 * state address so the user can sanity-check which instance is about to
 * be recreated.
 */
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

defineProps<{
  show: boolean
  /** OpenTofu state address of the VM to redeploy. */
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
    :title="$t('DeploymentDetailView.redeployModal.title')"
    :confirm-label="$t('DeploymentDetailView.redeployModal.confirm')"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <div class="flex flex-col gap-3">
      <p class="text-fg">{{ $t('DeploymentDetailView.redeployModal.text') }}</p>
      <p v-if="address" data-testid="redeploy-address" class="code-chip block break-all px-3 py-2 text-xs">{{ address }}</p>
    </div>
  </ConfirmModal>
</template>
