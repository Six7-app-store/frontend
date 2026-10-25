<script setup lang="ts">
/**
 * Notice shown when the backend found none of the deployment's VMs in
 * OpenStack any more (deleted outside the App Store). Offers to remove
 * the stale entry; the confirmation dialog lives here too so the view
 * only wires state and the handler.
 */
import AlertBox from '@/components/ui/AlertBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

defineProps<{
  deploymentName: string
  /** Owner/admin and no task in flight. Members see the notice without the button. */
  canRemove: boolean
  show: boolean
  busy?: boolean
}>()

defineEmits<{
  (e: 'open'): void
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <AlertBox tone="warning" :title="$t('DeploymentDetailView.vmMissingTitle')">
    {{ $t('DeploymentDetailView.vmMissingMessage') }}
    <template v-if="canRemove" #actions>
      <BaseButton variant="danger" :disabled="busy" @click="$emit('open')">
        {{ $t('DeploymentDetailView.removeEntry') }}
      </BaseButton>
    </template>
  </AlertBox>

  <ConfirmModal
    :show="show"
    :busy="busy"
    :title="$t('DeploymentDetailView.confirmRemoveEntryTitle')"
    :confirm-label="$t('DeploymentDetailView.removeEntry')"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <i18n-t keypath="DeploymentDetailView.confirmRemoveEntryMessage" tag="p" class="text-fg">
      <template #name><strong>{{ deploymentName }}</strong></template>
    </i18n-t>
  </ConfirmModal>
</template>
