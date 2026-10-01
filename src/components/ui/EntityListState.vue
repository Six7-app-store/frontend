<script setup lang="ts">
/**
 * Unified loading / empty / content wrapper for entity-list pages.
 *
 * Four states, one component:
 *   * ``isLoading`` → centered spinner + optional text
 *   * ``isError``   → centered error message + optional action
 *   * ``isEmpty``   → centered icon + empty message + optional action
 *   * otherwise     → the default slot (the entity list itself)
 *
 * Why a component: every main page had its own variant — text-only
 * loading vs. spinner-only vs. spinner-with-text, icon-with-text vs.
 * just-text empty states, different paddings. Centralising the three
 * shapes here gives the whole app a consistent feel without each
 * page rebuilding the same div-with-Tailwind block.
 *
 * Order of precedence: loading, then error, then empty.
 * ``isLoading`` wins over ``isEmpty``. That
 * matters because while data is being fetched, ``items.length === 0``
 * is also true, and you don't want to flash the "empty" CTA before
 * the spinner has had a chance to appear.
 */
import type { Component } from 'vue'
import EmptyState from './EmptyState.vue'
import Spinner from './Spinner.vue'

defineProps<{
  /** Whether the page is currently fetching its first batch of data.
   *  Wins over ``isEmpty`` — see component docs. */
  isLoading?: boolean
  /** Whether the list of entities is empty AFTER loading has settled.
   *  Callers usually express this as
   *  ``!store.isLoading && store.items.length === 0``. */
  isEmpty?: boolean
  /** Whether loading failed; shows ``errorMessage`` and the
   *  ``error-action`` slot (e.g. a link back to a list). */
  isError?: boolean
  errorMessage?: string
  /** Lucide icon component for the empty state (e.g. ``Inbox``,
   *  ``GraduationCap``). Falls back to no icon — the empty message
   *  alone is still rendered. */
  icon?: Component
  /** Visible text for the empty state. */
  emptyMessage?: string
  /** Optional text shown next to the loading spinner. Leave undefined
   *  for pages where the title is self-explanatory and a second
   *  "Lade…" line would just be noise. */
  loadingMessage?: string
}>()
</script>

<template>
  <div v-if="isLoading" class="flex flex-col items-center justify-center gap-3 py-12 text-fg-muted">
    <Spinner />
    <p v-if="loadingMessage" class="text-sm">{{ loadingMessage }}</p>
  </div>

  <EmptyState v-else-if="isError" :title="errorMessage">
    <slot name="error-action" />
  </EmptyState>

  <!-- The action slot usually holds the same button as the page header, so an
       empty page has a visible call to action; many empty states have none. -->
  <EmptyState v-else-if="isEmpty" :icon="icon" :title="emptyMessage">
    <slot name="empty-action" />
  </EmptyState>

  <!-- The list itself; no wrapper, so grids, tables and accordions all work. -->
  <slot v-else />
</template>
