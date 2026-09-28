<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { Loader2 } from 'lucide-vue-next'
import { isInAppPath } from '@/utils/safe-redirect'

const router = useRouter()
const authStore = useAuthStore()
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    // Handle OAuth callback
    const returnUrl = await authStore.handleCallback()
    
    // Back to where the sign-in started, if that is one of our pages. The
    // value round-trips through ?returnUrl=, so it is not trusted.
    router.push(isInAppPath(returnUrl) ? returnUrl : { name: ROUTE_NAMES.dashboard })
  } catch (err: any) {
    console.error('Callback error:', err)
    error.value = err.message || 'Authentication failed'
    
    // Redirect to login after short delay
    setTimeout(() => {
      router.push({ name: ROUTE_NAMES.login })
    }, 3000)
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <div class="text-center">
      <div v-if="!error" class="flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-icon" :size="48" />
        <p class="text-fg-muted">Completing authentication...</p>
      </div>
      
      <div v-else class="flex flex-col items-center gap-4">
        <div class="text-danger">
          <p class="font-semibold">Authentication Error</p>
          <p class="text-sm mt-2">{{ error }}</p>
        </div>
        <p class="text-sm text-fg-muted">Redirecting to login...</p>
      </div>
    </div>
  </div>
</template>
