<script setup lang="ts">
/** The app's one loading spinner. */
import { Loader2 } from 'lucide-vue-next'

withDefaults(defineProps<{ size?: number }>(), { size: 32 })
</script>

<template>
  <Loader2 :size="size" class="animate-spin text-icon" aria-hidden="true" />
</template>
