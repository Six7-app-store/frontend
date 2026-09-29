<script setup lang="ts">
/**
 * A ``ConfirmModal`` that also asks for a text (a rejection reason, a note
 * for the reviewers). The default slot shows what the text is about, the
 * ``after`` slot anything the server sent back (e.g. validation errors).
 * With ``required`` the confirm button stays disabled until the text has
 * more than whitespace; the caller trims before sending.
 */
import ConfirmModal from './ConfirmModal.vue'
import type { ButtonVariant } from './BaseButton.vue'

const props = withDefaults(defineProps<{
  show: boolean
  title: string
  confirmLabel: string
  label: string
  placeholder?: string
  required?: boolean
  busy?: boolean
  variant?: ButtonVariant
}>(), {
  placeholder: '',
  required: false,
  busy: false,
  variant: 'primary',
})

const text = defineModel<string>({ required: true })

defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <ConfirmModal
    :show="show"
    :title="title"
    :confirm-label="confirmLabel"
    :variant="variant"
    :busy="busy"
    :confirm-disabled="props.required && !text.trim()"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <div class="space-y-4">
      <slot />
      <div>
        <label class="block text-sm font-medium text-fg mb-1.5">{{ label }}</label>
        <textarea
          v-model="text"
          :placeholder="placeholder"
          rows="4"
          class="field w-full px-3 py-2 text-sm focus:border-accent/60 resize-none"
        />
      </div>
      <slot name="after" />
    </div>
  </ConfirmModal>
</template>
