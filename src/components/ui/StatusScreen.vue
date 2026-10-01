<script setup lang="ts">
/**
 * One state of a status page: a large icon (or a spinner while
 * ``loading``), a title and an explanation, then whatever the page adds
 * in the default slot (a form, a button). ``tone`` colours the icon —
 * and for ``danger`` the title.
 */
import type { Component } from 'vue'
import { Loader2 } from 'lucide-vue-next'

withDefaults(defineProps<{
  icon?: Component
  loading?: boolean
  tone?: 'default' | 'success' | 'danger'
  title?: string
  text?: string
}>(), {
  icon: undefined,
  loading: false,
  tone: 'default',
  title: undefined,
  text: undefined,
})
</script>

<template>
  <div class="flex w-full flex-col items-start gap-4">
    <template v-if="loading">
      <Loader2 class="animate-spin text-icon" :size="28" aria-hidden="true" />
      <p class="text-md text-fg-muted" role="status">{{ text }}</p>
    </template>
    <template v-else>
      <component
        :is="icon"
        v-if="icon"
        :size="28"
        :stroke-width="1.75"
        aria-hidden="true"
        :class="{ 'text-icon': tone === 'default', 'text-success-dot': tone === 'success', 'text-danger': tone === 'danger' }"
      />
      <div v-if="title || text || $slots.text" class="flex flex-col gap-2">
        <h1 v-if="title" class="text-3xl font-semibold text-heading" :class="{ 'text-danger': tone === 'danger' }">{{ title }}</h1>
        <p v-if="text" class="text-md text-fg-muted">{{ text }}</p>
        <slot name="text" />
      </div>
    </template>
    <slot />
  </div>
</template>
