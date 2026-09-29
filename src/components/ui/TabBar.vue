<script setup lang="ts" generic="K extends string">
/**
 * Underlined tab row bound to the active tab's key with ``v-model``. The
 * ``extra`` slot adds something after a tab's label (a hint dot, a
 * "recommended" note); ``fill`` stretches the tabs across the full width.
 */
import type { Tab } from './tab'

withDefaults(defineProps<{
  tabs: Tab<K>[]
  fill?: boolean
}>(), {
  fill: false,
})

const active = defineModel<K>({ required: true })

defineSlots<{
  extra?: (props: { tab: Tab<K> }) => unknown
}>()
</script>

<template>
  <div role="tablist" class="flex border-b border-subtle" :class="{ 'gap-1': !fill }">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      :aria-selected="active === tab.key"
      class="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px"
      :class="[
        active === tab.key
          ? 'border-accent text-fg'
          : 'border-transparent text-fg-muted hover:text-fg hover:border-strong',
        { 'flex-1': fill },
      ]"
      @click="active = tab.key"
    >
      <component :is="tab.icon" v-if="tab.icon" :size="16" />
      {{ tab.label }}
      <slot name="extra" :tab="tab" />
    </button>
  </div>
</template>
