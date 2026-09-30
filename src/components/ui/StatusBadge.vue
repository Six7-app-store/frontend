<script setup lang="ts">
/**
 * A status as text with a dot in the status colour, or with an icon when the
 * status has one of its own. Green and yellow only ever mean status.
 * ``md`` is the page-header size, ``sm`` the one for lists and tables.
 */
import type { Component } from 'vue'
import type { StatusTone } from '@/types/tone'

withDefaults(defineProps<{
  tone: StatusTone
  size?: 'sm' | 'md'
  icon?: Component
}>(), {
  size: 'sm',
})

const TEXT_CLASS: Record<StatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-fg-muted',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold"
    :class="[TEXT_CLASS[tone], size === 'md' ? 'text-base' : 'text-sm']"
  >
    <component :is="icon" v-if="icon" :size="13" class="shrink-0" aria-hidden="true" />
    <span v-else class="status-dot" :class="`status-dot-${tone}`" aria-hidden="true" />
    <slot />
  </span>
</template>
