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
  <ul class="surface-panel grid grid-cols-1 divide-y divide-subtle overflow-hidden sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0">
    <li v-for="stat in items" :key="stat.id">
      <component
        :is="stat.to ? 'RouterLink' : 'div'"
        :to="stat.to"
        class="hover-tint flex h-full items-baseline justify-between gap-4 px-6 py-5"
      >
        <span class="flex min-w-0 items-baseline gap-3">
          <span class="text-6xl font-semibold leading-none tabular-nums text-heading">{{ stat.value }}</span>
          <span class="truncate text-base text-fg-muted">{{ stat.label }}</span>
        </span>
        <ChevronRight v-if="stat.to" :size="16" class="shrink-0 self-center text-disabled" aria-hidden="true" />
      </component>
    </li>
  </ul>
</template>
