<script setup lang="ts">
/** Label/value facts of an entity. Entries without a value are left out entirely. */
import { computed } from 'vue'

export interface InfoItem {
  label: string
  value?: string | number | null
  /** Versions, commits, URLs and names of variables are set in monospace. */
  mono?: boolean
}

const props = defineProps<{
  items: InfoItem[]
}>()

const visible = computed(() => props.items.filter((item) => String(item.value ?? '').trim() !== ''))
</script>

<template>
  <dl v-if="visible.length" class="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
    <template v-for="item in visible" :key="item.label">
      <dt class="text-fg-muted">{{ item.label }}</dt>
      <dd class="min-w-0 break-words text-fg" :class="{ 'font-mono': item.mono }">{{ item.value }}</dd>
    </template>
  </dl>
</template>
