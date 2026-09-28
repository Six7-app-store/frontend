<script setup lang="ts">
/**
 * Status pill for a deployment or task: translated label in the status's
 * tone (see ``utils/deployment-status-styles``). ``md`` is the page-header
 * size, ``sm`` the one for lists.
 */
import { computed } from 'vue'
import { getStatusStyles } from '@/utils/deployment-status-styles'

const props = withDefaults(defineProps<{
  status?: string
  size?: 'sm' | 'md'
}>(), {
  size: 'sm',
})

const styles = computed(() => getStatusStyles(props.status))
</script>

<template>
  <span
    class="inline-flex items-center font-semibold border capitalize whitespace-nowrap"
    :class="[
      styles.badgeClass,
      size === 'md' ? 'px-3 py-1.5 rounded-lg text-sm' : 'px-2 py-0.5 rounded text-xs',
    ]"
  >
    {{ $t(styles.label) }}
  </span>
</template>
