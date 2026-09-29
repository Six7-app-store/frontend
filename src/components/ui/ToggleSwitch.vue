<script setup lang="ts">
/**
 * On/off switch bound with ``v-model``. ``label`` names the switch for
 * screen readers when no visible text is attached to it; ``sm`` is the
 * compact size for toolbars.
 */
withDefaults(defineProps<{
  label: string
  size?: 'sm' | 'md'
  disabled?: boolean
}>(), {
  size: 'md',
  disabled: false,
})

const on = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="on"
    :aria-label="label"
    :disabled="disabled"
    class="relative inline-flex flex-shrink-0 items-center rounded-full border p-px transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[on ? 'toggle-on' : 'toggle-off', size === 'sm' ? 'h-5 w-10' : 'h-6 w-11']"
    @click="on = !on"
  >
    <span
      class="toggle-knob inline-block transform rounded-full transition duration-200"
      :class="[size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', on ? 'translate-x-5' : 'translate-x-0']"
    />
  </button>
</template>
