<script setup lang="ts" generic="V extends string | number">
/**
 * Native select in the field style. Bind it with ``v-model``; ``id``,
 * ``disabled`` and ``aria-*`` attributes go to the select itself, ``class``
 * to the wrapper. Name it with ``FormField`` or an ``aria-label``.
 */
import { computed, useAttrs } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

export interface SelectOption<V extends string | number = string> {
  value: V
  label: string
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

defineProps<{
  options: SelectOption<V>[]
  /** Unselectable first entry shown while nothing is chosen. */
  placeholder?: string
}>()

const selected = defineModel<V | ''>({ required: true })

const attrs = useAttrs()
const selectAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>

<template>
  <div class="relative" :class="attrs.class">
    <select v-model="selected" v-bind="selectAttrs" class="field w-full appearance-none pl-3 pr-9">
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
        {{ option.label }}
      </option>
    </select>
    <ChevronDown
      :size="16"
      class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-icon"
      aria-hidden="true"
    />
  </div>
</template>
