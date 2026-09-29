<script setup lang="ts">
/**
 * One state of a status page: a large icon (or a spinner while
 * ``loading``), a title and an explanation, then whatever the page adds
 * in the default slot (a form, a button). ``tone`` colours the icon —
 * and for ``danger`` the whole block.
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
  <div class="flex flex-col items-center gap-4 w-full" :class="{ 'text-danger': tone === 'danger' }">
    <template v-if="loading">
      <Loader2 class="animate-spin text-icon" :size="48" />
      <p class="text-fg-muted">{{ text }}</p>
    </template>
    <template v-else>
      <component
        :is="icon"
        v-if="icon"
        :size="48"
        :class="{ 'text-icon': tone === 'default', 'text-success': tone === 'success' }"
      />
      <div v-if="title || text || $slots.text">
        <p v-if="title" class="font-semibold">{{ title }}</p>
        <p v-if="text" class="text-sm mt-2" :class="{ 'text-fg-muted': tone !== 'danger' }">{{ text }}</p>
        <slot name="text" />
      </div>
    </template>
    <slot />
  </div>
</template>
