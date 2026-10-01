<script setup lang="ts">
/**
 * Notice that the OpenStack credentials are missing, invalid or locked,
 * with the one action that fixes it. ``next`` sends the person back here
 * after they have set the credentials up.
 */
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { Lock } from 'lucide-vue-next'
import AlertBox, { type AlertTone } from '@/components/ui/AlertBox.vue'

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

const TONE: Record<Variant, AlertTone> = { warning: 'warning', error: 'danger', lock: 'info' }

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
  <AlertBox :tone="TONE[variant]" :title="title" :icon="variant === 'lock' ? Lock : undefined">
    <p v-if="message">{{ message }}</p>
    <template v-if="cta && ctaLocation" #actions>
      <RouterLink
        :to="ctaLocation"
        class="btn"
        :class="variant === 'lock' ? 'btn-secondary' : 'btn-primary'"
      >
        {{ cta }}
      </RouterLink>
    </template>
  </AlertBox>
</template>
