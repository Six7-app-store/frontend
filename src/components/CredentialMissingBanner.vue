<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { AlertTriangle, AlertCircle, Lock } from 'lucide-vue-next'

type Variant = 'warning' | 'error' | 'lock'

const props = withDefaults(defineProps<{
  variant?: Variant
  title?: string
  message?: string
  cta?: string
  ctaTo?: RouteLocationRaw
  next?: RouteLocationRaw
}>(), {
  variant: 'warning',
})

const styles = computed(() => {
  switch (props.variant) {
    case 'error':
      return {
        wrapper: 'bg-danger-dot/[.06] border-danger-dot/30',
        iconBox: 'bg-danger-dot/10 text-danger',
        title: 'text-danger',
        message: 'text-fg',
        cta: 'btn-primary',
        icon: AlertCircle,
      }
    case 'lock':
      return {
        wrapper: 'bg-line/[.04] border-subtle',
        iconBox: 'bg-line/[.07] text-icon',
        title: 'text-fg',
        message: 'text-fg-muted',
        cta: 'btn-secondary',
        icon: Lock,
      }
    case 'warning':
    default:
      return {
        wrapper: 'bg-warning-dot/[.08] border-warning-dot/40',
        iconBox: 'bg-warning-dot/15 text-warning',
        title: 'text-warning',
        message: 'text-fg',
        cta: 'btn-primary',
        icon: AlertTriangle,
      }
  }
})

const router = useRouter()

const ctaLocation = computed(() => {
  if (!props.ctaTo) return null
  if (props.next) {
    // The target page reads ``next`` from the query as a URL path and
    // navigates back to it, so route objects are resolved to their path.
    const next = typeof props.next === 'string' ? props.next : router.resolve(props.next).fullPath
    const base = typeof props.ctaTo === 'string' ? { path: props.ctaTo } : props.ctaTo
    return { ...base, query: { next } }
  }
  return props.ctaTo
})
</script>

<template>
  <div
    class="rounded-panel border p-4 flex items-start gap-4"
    :class="styles.wrapper"
  >
    <div
      class="w-10 h-10 rounded-control flex items-center justify-center shrink-0"
      :class="styles.iconBox"
    >
      <component :is="styles.icon" :size="20" />
    </div>
    <div class="flex-1 min-w-0">
      <p v-if="title" class="font-semibold" :class="styles.title">{{ title }}</p>
      <p v-if="message" class="text-sm mt-0.5" :class="styles.message">{{ message }}</p>
    </div>
    <router-link
      v-if="cta && ctaLocation"
      :to="ctaLocation"
      class="shrink-0 px-4 py-2 rounded-control text-sm font-semibold transition"
      :class="styles.cta"
    >
      {{ cta }}
    </router-link>
  </div>
</template>
