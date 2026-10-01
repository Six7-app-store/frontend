<script setup lang="ts">
import { badgeVariantClasses, type BadgeVariant } from './badge-variants'

defineProps<{
  variant?: BadgeVariant
}>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 rounded-tag border text-xs font-medium',
      badgeVariantClasses(variant)
    ]"
  >
    <slot />
  </span>
</template>
