<script setup lang="ts">
/**
 * Confirmation dialog for redeploying a single VM. Shows the Terraform
 * state address so the user can sanity-check which instance is about to
 * be recreated.
 */
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

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
  <ConfirmModal
    :show="show"
    title="VM neu erstellen?"
    confirm-label="Redeploy"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <div class="space-y-3">
      <p class="text-fg">
        Diese VM wird zerstört und identisch neu erstellt.
        Andere VMs in diesem Deployment bleiben unangetastet.
      </p>
      <p v-if="address" class="text-xs font-mono text-fg-muted bg-line/[.04] border border-subtle rounded-lg px-3 py-2 break-all">
        {{ address }}
      </p>
    </div>
  </ConfirmModal>
</template>
