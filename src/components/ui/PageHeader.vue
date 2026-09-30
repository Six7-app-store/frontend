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

// Overview pages line the actions up with the subtitle, detail pages with the title.
const ALIGN_CLASS = {
  page: 'items-end',
  detail: 'items-start',
  greeting: 'items-center',
} as const

const TITLE_CLASS = {
  page: 'text-4xl tracking-[-0.01em]',
  detail: 'text-5xl tracking-[-0.01em]',
  greeting: 'text-3xl',
} as const
</script>

<template>
  <div class="mb-section flex flex-wrap justify-between gap-4" :class="ALIGN_CLASS[size]">
    <div class="min-w-0">
      <h1 class="font-semibold text-heading" :class="TITLE_CLASS[size]">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1.5 text-base text-fg-muted">{{ subtitle }}</p>
      <slot name="meta" />
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
