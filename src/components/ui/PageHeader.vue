<script setup lang="ts">
/**
 * Header of a page: title and optional subtitle on the left, the page's main
 * action in the ``actions`` slot on the right. ``size`` picks the title scale:
 * ``page`` for overview pages, ``detail`` for detail pages, ``greeting`` for
 * the dashboard's welcome line.
 */
withDefaults(defineProps<{
  title: string
  subtitle?: string
  size?: 'page' | 'detail' | 'greeting'
}>(), {
  size: 'page',
})

const TITLE_CLASS = {
  page: 'text-4xl tracking-[-0.01em]',
  detail: 'text-5xl tracking-[-0.01em]',
  greeting: 'text-3xl',
} as const
</script>

<template>
  <div class="mb-section flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0">
      <h1 class="font-semibold text-heading" :class="TITLE_CLASS[size]">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-md text-fg-muted">{{ subtitle }}</p>
      <slot name="meta" />
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
