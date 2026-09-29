<script setup lang="ts">
/**
 * Yes/no dialog: the default slot says what is about to happen. While
 * ``busy`` both buttons are disabled and the dialog cannot be dismissed,
 * so a running request is neither sent twice nor loses its dialog.
 */
import BaseButton, { type ButtonVariant } from './BaseButton.vue'
import Modal from './Modal.vue'

const props = withDefaults(defineProps<{
  show: boolean
  title: string
  confirmLabel: string
  /** Confirm-button text while ``busy``; defaults to ``confirmLabel``. */
  busyLabel?: string
  cancelLabel?: string
  variant?: ButtonVariant
  busy?: boolean
  /** Keeps confirm disabled, e.g. until a required input is filled. */
  confirmDisabled?: boolean
}>(), {
  busyLabel: undefined,
  cancelLabel: undefined,
  variant: 'danger',
  busy: false,
  confirmDisabled: false,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const close = () => {
  if (!props.busy) emit('close')
}
</script>

<template>
  <Modal :show="show" @close="close">
    <template #title>{{ title }}</template>
    <template #body>
      <slot />
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" :disabled="busy" @click="close">
          {{ cancelLabel ?? $t('action.cancel') }}
        </BaseButton>
        <BaseButton :variant="variant" :disabled="busy || confirmDisabled" @click="emit('confirm')">
          {{ busy && busyLabel ? busyLabel : confirmLabel }}
        </BaseButton>
      </div>
    </template>
  </Modal>
</template>
