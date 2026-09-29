<script setup lang="ts">
/**
 * A section of a detail page: card shell, header with icon tile, title and
 * an optional counter, actions on the right (a refresh or back button),
 * then the content.
 */
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  /** Shown next to the title when greater than zero. */
  count?: number
}>()
</script>

<template>
  <section class="bg-panel rounded-xl border border-subtle p-6 shadow-sm">
    <div class="flex items-center justify-between gap-3 flex-wrap mb-5">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-line/[.07] rounded-lg">
          <component :is="icon" :size="20" class="text-icon" />
        </div>
        <h2 class="text-lg font-semibold text-fg">{{ title }}</h2>
        <span v-if="count" class="px-2 py-0.5 bg-line/[.07] text-fg-muted text-xs font-bold rounded">
          {{ count }}
        </span>
      </div>
      <slot name="actions" />
    </div>
    <slot />
  </section>
</template>
