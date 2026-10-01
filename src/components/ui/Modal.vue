<script setup lang="ts">
/**
 * Dialog over a dimmed page: header (``#header`` or its alias ``#title``),
 * body (``#body`` or the default slot) and an optional ``#footer``.
 * Esc and a click on the backdrop ask to close; when it opens, focus moves
 * into the dialog so keyboard users land where the question is.
 */
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits(['close'])

const { t } = useI18n()
const panel = ref<HTMLElement | null>(null)
const titleId = useId()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.show,
  async (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      // The first field if there is one, otherwise the dialog itself.
      const target = panel.value?.querySelector<HTMLElement>('input, textarea, select') ?? panel.value
      target?.focus()
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    v-if="show"
    class="scrim fixed inset-0 z-50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div
      ref="panel"
      class="surface-overlay flex max-h-[90vh] w-full max-w-[520px] flex-col outline-none"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      @click.stop
    >
      <div class="flex items-center justify-between gap-4 border-b border-faint px-6 py-4">
        <div :id="titleId" class="text-lg font-semibold text-heading">
          <!-- ``#header`` (courses) and ``#title`` (deployments, apps) are both accepted. -->
          <slot name="header">
            <slot name="title">Modal</slot>
          </slot>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-icon -mr-2 shrink-0"
          :aria-label="t('common.close')"
          @click="$emit('close')"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </div>

      <div class="flex-grow overflow-y-auto px-6 py-5">
        <slot name="body">
          <slot></slot>
        </slot>
      </div>

      <div v-if="$slots.footer" class="modal-footer rounded-b-panel border-t border-faint bg-line/[.03] px-6 py-4">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>
