<script setup lang="ts">
/**
 * App-wide button. ``primary`` is the red accent (the one main action of an
 * area), ``secondary`` the neutral glass button, ``danger`` a destructive
 * action (neutral until hovered), ``ghost`` very subtle (cancel in modals).
 *
 * ``icon`` renders a square icon-only button; ``label`` then names it for
 * screen readers. A disabled button looks grey and flat, and
 * ``disabledReason`` tells people why (tooltip and screen-reader text).
 */
import { computed, useAttrs, useId } from 'vue'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  /** Square icon-only button (the default slot holds the icon). */
  icon?: boolean
  /** Accessible name of an icon-only button. */
  label?: string
  /** Why the button is disabled; shown only while it is. */
  disabledReason?: string
}>(), {
  variant: 'primary',
  size: 'md',
  icon: false,
})

const attrs = useAttrs()
const reasonId = useId()

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

const classes = computed(() => [
  'btn',
  VARIANT_CLASS[props.variant],
  SIZE_CLASS[props.size],
  { 'btn-icon': props.icon },
])

const isDisabled = computed(() => attrs.disabled !== undefined && attrs.disabled !== false)
const reason = computed(() => (isDisabled.value ? props.disabledReason : undefined))
</script>

<template>
  <button
    :class="classes"
    :aria-label="icon ? label : undefined"
    :title="reason"
    :aria-describedby="reason ? reasonId : undefined"
  >
    <slot />
    <span v-if="reason" :id="reasonId" class="sr-only">{{ reason }}</span>
  </button>
</template>
