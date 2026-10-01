<script setup lang="ts">
defineProps<{
  modelValue?: string
  placeholder?: string
  type?: string
}>()
defineEmits(['update:modelValue'])
</script>

<template>
  <input
    :type="type || 'text'"
    :placeholder="placeholder"
    :value="modelValue"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    class="field w-full px-4 py-2 transition"
  />
</template>
