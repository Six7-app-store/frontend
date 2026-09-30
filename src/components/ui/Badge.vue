<script setup lang="ts">
/** Compact label chip (roles, scopes). For a status use ``StatusBadge``. */
import type { BadgeTone } from '@/types/tone'
import { badgeToneClasses } from './badge-tones'

defineProps<{
  tone?: BadgeTone
}>()
</script>

<template>
  <span
    :class="[
      'status-badge px-2 py-0.5 text-xs font-semibold',
      badgeToneClasses(tone)
    ]"
  >
    <slot />
  </span>
</template>
