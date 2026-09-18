<script setup lang="ts">
import { badgeVariantClasses, type BadgeVariant } from './badge-variants'

defineProps<{
  variant?: BadgeVariant
}>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
      badgeVariantClasses(variant)
    ]"
  >
    <slot />
  </span>
</template>
