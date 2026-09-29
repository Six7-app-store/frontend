<script setup lang="ts">
/**
 * Copies ``text`` and flips to a check for a moment. All copy buttons of a
 * page share one "just copied" state (``injectCopyToClipboard``); ``copyKey``
 * tells which button that state belongs to. ``labeled`` shows "Copy" /
 * "Copied" next to the icon, ``icon`` only the icon with ``title`` as its
 * tooltip.
 */
import { computed } from 'vue'
import { Check, Copy } from 'lucide-vue-next'
import { injectCopyToClipboard } from '@/composables/useCopyToClipboard'

const props = withDefaults(defineProps<{
  text: string | null | undefined
  copyKey: string
  /** Tooltip before copying. */
  title: string
  variant?: 'labeled' | 'icon'
}>(), {
  variant: 'icon',
})

const { copiedKey, copyToClipboard } = injectCopyToClipboard()
const copied = computed(() => copiedKey.value === props.copyKey)
</script>

<template>
  <button
    v-if="variant === 'labeled'"
    type="button"
    :title="copied ? $t('common.copiedToClipboard') : title"
    class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors"
    :class="copied ? 'status-success' : 'bg-panel text-fg border-strong hover:bg-line/[.04]'"
    @click="copyToClipboard(text ?? '', copyKey)"
  >
    <component :is="copied ? Check : Copy" :size="13" />
    {{ copied ? $t('common.copied') : $t('common.copy') }}
  </button>
  <button
    v-else
    type="button"
    :title="copied ? $t('common.copiedToClipboard') : title"
    class="text-fg-muted hover:text-warning p-0.5 rounded hover:bg-line/[.12] transition-colors flex-shrink-0"
    @click="copyToClipboard(text ?? '', copyKey)"
  >
    <component :is="copied ? Check : Copy" :size="12" />
  </button>
</template>
