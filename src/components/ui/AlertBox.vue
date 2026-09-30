<script setup lang="ts">
/**
 * Notice box. ``warning`` is the default; the ``actions`` slot holds the one
 * action the notice asks for (it is the only red thing in the box, if any).
 */
import { AlertOctagon, AlertTriangle, CheckCircle, Info } from 'lucide-vue-next'

export type AlertTone = 'warning' | 'info' | 'danger' | 'success'

withDefaults(defineProps<{
  tone?: AlertTone
  title?: string
}>(), {
  tone: 'warning',
})

const ICON = {
  warning: AlertTriangle,
  info: Info,
  danger: AlertOctagon,
  success: CheckCircle,
} as const
</script>

<template>
  <div class="alert" :class="`alert-${tone}`" :role="tone === 'danger' ? 'alert' : undefined">
    <component :is="ICON[tone]" :size="18" class="alert-icon mt-0.5 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="alert-title text-md font-semibold">{{ title }}</p>
      <div class="text-base text-fg-body">
        <slot />
      </div>
    </div>
    <div v-if="$slots.actions" class="shrink-0 self-center">
      <slot name="actions" />
    </div>
  </div>
</template>
