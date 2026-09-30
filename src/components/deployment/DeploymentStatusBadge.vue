<script setup lang="ts">
/** Status of a deployment or task: translated label in the status's tone (see ``utils/deployment-status-styles``). */
import { computed } from 'vue'
import { getStatusStyles } from '@/utils/deployment-status-styles'
import StatusBadge from '@/components/ui/StatusBadge.vue'

const props = withDefaults(defineProps<{
  status?: string
  size?: 'sm' | 'md'
}>(), {
  size: 'sm',
})

const styles = computed(() => getStatusStyles(props.status))
</script>

<template>
  <StatusBadge :tone="styles.tone" :size="size">{{ $t(styles.label) }}</StatusBadge>
</template>
