<script setup lang="ts">
/** Where the current page sits, e.g. "Apps / Online-IDE". The last crumb is the current page and no link. */
import type { RouteLocationRaw } from 'vue-router'

export interface Crumb {
  label: string
  to?: RouteLocationRaw
}

defineProps<{
  items: Crumb[]
}>()
</script>

<template>
  <nav :aria-label="$t('breadcrumb.label')" class="min-w-0">
    <ol class="flex min-w-0 items-center gap-2 text-base">
      <li v-for="(crumb, index) in items" :key="index" class="flex min-w-0 items-center gap-2">
        <span v-if="index > 0" class="text-icon" aria-hidden="true">/</span>
        <RouterLink
          v-if="crumb.to && index < items.length - 1"
          :to="crumb.to"
          class="truncate text-fg-muted transition-colors hover:text-heading"
        >
          {{ crumb.label }}
        </RouterLink>
        <span
          v-else
          class="truncate font-semibold text-heading"
          :aria-current="index === items.length - 1 ? 'page' : undefined"
        >
          {{ crumb.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
