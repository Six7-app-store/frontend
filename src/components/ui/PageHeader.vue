<script setup lang="ts">
/**
 * Unified page header for all top-level "main entity" views
 * (Deployments, Apps, Kurse, Approvals, User-Settings, ...).
 *
 * Lifts the exact pattern from ``CoursesView.vue`` into a reusable
 * component: a flex row with title + optional subtitle on the left
 * and an actions slot on the right. ``mb-8`` separator below so the
 * page body always sits the same distance from the title.
 *
 * Why a component and not a Tailwind preset: the actions slot is
 * page-specific (create button, filter toggle, refresh, ...). A
 * slot beats a prop here because each page wants different
 * combinations of buttons, sometimes none.
 */
import type { Component } from 'vue'

defineProps<{
  title: string
  /** Optional lucide icon left of the title. */
  icon?: Component
  /** Optional one-line subtitle in muted gray. Omitting it just
   *  removes the line — title sizing stays the same. */
  subtitle?: string
}>()
</script>

<template>
  <div class="flex items-center justify-between mb-8 gap-4 flex-wrap">
    <div class="min-w-0 flex items-center gap-4">
      <component :is="icon" v-if="icon" :size="28" class="text-icon shrink-0" />
      <div class="min-w-0">
        <h1 class="text-[32px] leading-tight font-semibold tracking-[-0.015em] text-fg mb-1">{{ title }}</h1>
        <p v-if="subtitle" class="text-fg-muted">{{ subtitle }}</p>
      </div>
    </div>
    <!--
      Actions go right of the title row. Multiple buttons stack
      horizontally; the parent decides the order. When the slot is
      empty Vue renders nothing here and the title row uses the full
      width — no empty placeholder div.
    -->
    <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
