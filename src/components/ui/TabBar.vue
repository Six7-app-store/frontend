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
  <div role="tablist" class="flex border-b border-subtle" :class="{ 'gap-6': !fill }">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      :aria-selected="active === tab.key"
      class="-mb-px flex h-10 items-center justify-center gap-2 border-b-2 text-base transition-colors"
      :class="[
        active === tab.key
          ? 'border-accent font-semibold text-heading'
          : 'border-transparent text-fg-muted hover:text-fg',
        fill ? 'flex-1 px-4' : '',
      ]"
      @click="active = tab.key"
    >
      <component :is="tab.icon" v-if="tab.icon" :size="16" />
      {{ tab.label }}
      <slot name="extra" :tab="tab" />
    </button>
  </div>
</template>
