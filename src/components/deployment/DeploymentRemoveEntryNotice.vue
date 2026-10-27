<script setup lang="ts">
/**
 * Notice for a deployment that "Delete" cannot clean up: none of its VMs
 * exist in OpenStack any more (deleted outside the App Store), or its last
 * destroy failed (e.g. the app repo is gone). Offers to remove the entry
 * without a destroy; the confirmation dialog lives here too so the view
 * only wires state and the handler.
 */
import AlertBox from '@/components/ui/AlertBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import type { EntryRemovalReason } from '@/services/deployment-lifecycle.service'

defineProps<{
  reason: EntryRemovalReason
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

// Spelled out per reason so the i18n keys stay greppable.
const TEXT = {
  vm_missing: { title: 'DeploymentDetailView.vmMissingTitle', message: 'DeploymentDetailView.vmMissingMessage' },
  destroy_failed: { title: 'DeploymentDetailView.destroyFailedTitle', message: 'DeploymentDetailView.destroyFailedMessage' },
} as const
</script>

<template>
  <AlertBox tone="warning" :title="$t(TEXT[reason].title)" :data-testid="`remove-entry-${reason}`">
    {{ $t(TEXT[reason].message) }}
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
