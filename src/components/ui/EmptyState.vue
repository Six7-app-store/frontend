<script setup lang="ts">
/** Centered notice for "nothing here" and "could not load": optional icon, title, text and actions. */
import type { Component } from 'vue'

defineProps<{
  title?: string
  description?: string
  icon?: Component
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
    <component :is="icon" v-if="icon" :size="22" class="text-icon" aria-hidden="true" />
    <p v-if="title" class="text-md font-semibold text-heading">{{ title }}</p>
    <p v-if="description" class="max-w-md text-base text-fg-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-2 flex items-center gap-2">
      <slot />
    </div>
  </div>
</template>
