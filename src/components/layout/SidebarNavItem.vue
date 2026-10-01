<script setup lang="ts">
/** One link of the sidebar. The active one carries the red marker; collapsed, only the icon shows. */
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  to: RouteLocationRaw
  label: string
  icon: Component
  active: boolean
  collapsed: boolean
}>()
</script>

<template>
  <RouterLink
    :to="to"
    class="nav-item"
    :class="{ 'nav-item-active': active, 'nav-item-collapsed': collapsed }"
    :aria-current="active ? 'page' : undefined"
    :title="collapsed ? label : undefined"
    active-class=""
    exact-active-class=""
  >
    <component :is="icon" :size="18" :stroke-width="1.75" class="nav-item-icon shrink-0" aria-hidden="true" />
    <span :class="collapsed ? 'sr-only' : 'truncate'">{{ label }}</span>
  </RouterLink>
</template>
