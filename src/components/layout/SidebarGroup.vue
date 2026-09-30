<script setup lang="ts">
/** A labelled group of sidebar links ("Verwaltung"); collapsed, the label gives way to a divider. */
import { useId } from 'vue'

defineProps<{
  label: string
  collapsed: boolean
}>()

const labelId = useId()
</script>

<template>
  <div class="mt-4">
    <p v-if="!collapsed" :id="labelId" class="mb-1 px-3 text-xs font-semibold text-fg-subtle">{{ label }}</p>
    <div v-else class="mx-3 mb-2 border-t border-subtle" role="separator" />
    <ul class="flex flex-col gap-0.5" :aria-labelledby="collapsed ? undefined : labelId" :aria-label="collapsed ? label : undefined">
      <slot />
    </ul>
  </div>
</template>
