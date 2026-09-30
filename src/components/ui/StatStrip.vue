<script setup lang="ts">
/** Row of key figures in one panel; an item with ``to`` is a link to the list behind the number. */
import { ChevronRight } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

export interface Stat {
  id: string
  label: string
  value: number | string
  to?: RouteLocationRaw
}

defineProps<{
  items: Stat[]
}>()
</script>

<template>
  <ul class="surface-panel grid grid-cols-1 divide-y divide-faint overflow-hidden sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0">
    <li v-for="stat in items" :key="stat.id">
      <component
        :is="stat.to ? 'RouterLink' : 'div'"
        :to="stat.to"
        class="hover-tint flex h-full items-center justify-between gap-4 px-panel py-4"
      >
        <span class="min-w-0">
          <span class="block text-sm text-fg-muted">{{ stat.label }}</span>
          <span class="mt-1 block text-6xl font-semibold leading-none tabular-nums text-heading">{{ stat.value }}</span>
        </span>
        <ChevronRight v-if="stat.to" :size="16" class="shrink-0 text-icon" aria-hidden="true" />
      </component>
    </li>
  </ul>
</template>
