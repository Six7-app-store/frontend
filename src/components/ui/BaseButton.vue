<script setup lang="ts">
/**
 * App-wide button. ``primary`` is the red accent (main action), ``secondary``
 * the neutral glass button, ``danger`` destructive, ``ghost`` very subtle
 * (cancel in modals). Disabled buttons fade out; the hover styles in
 * components.css skip them.
 */
import { computed } from 'vue'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
}>(), {
  variant: 'primary',
  size: 'md',
})

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-4 py-2',
  md: 'px-5 py-2.5',
}

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2',
  `${SIZE_CLASS[props.size]} rounded-control font-semibold text-sm transition duration-150`,
  'disabled:opacity-50 disabled:cursor-not-allowed',
  VARIANT_CLASS[props.variant],
])
</script>

<template>
  <button :class="classes">
    <slot />
  </button>
</template>
