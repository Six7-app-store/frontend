<script setup lang="ts">
/**
 * "← Back" above a detail page. With ``to`` it is a real link (so it can be
 * opened in a new tab); without, it steps back in the browser history,
 * for pages reached from more than one place.
 */
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

defineProps<{
  label: string
  to?: RouteLocationRaw
}>()

const router = useRouter()
const classes = 'inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors'
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes">
    <ArrowLeft :size="16" />
    {{ label }}
  </RouterLink>
  <button v-else type="button" :class="classes" @click="router.back()">
    <ArrowLeft :size="16" />
    {{ label }}
  </button>
</template>
