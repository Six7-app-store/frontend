<script setup lang="ts" generic="K extends string">
/**
 * Switch between a few mutually exclusive options (language, filters).
 * Bound with ``v-model`` to the selected option's value; ``ariaLabel`` names
 * the group. For content tabs use ``TabBar``.
 */
import type { SegmentOption } from './segment'

withDefaults(defineProps<{
  options: SegmentOption<K>[]
  ariaLabel: string
  size?: 'sm' | 'md'
}>(), {
  size: 'sm',
})

const selected = defineModel<K>({ required: true })
</script>

<template>
  <div class="segment" :class="{ 'segment-md': size === 'md' }" role="group" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segment-btn"
      :aria-pressed="selected === option.value"
      @click="selected = option.value"
    >
      <component :is="option.icon" v-if="option.icon" :size="13" aria-hidden="true" />
      {{ option.label }}
    </button>
  </div>
</template>
