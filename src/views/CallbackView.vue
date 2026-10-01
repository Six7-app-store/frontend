<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import StatusPage from '@/components/ui/StatusPage.vue'
import StatusScreen from '@/components/ui/StatusScreen.vue'
import { isInAppPath } from '@/utils/safe-redirect'

const router = useRouter()
const authStore = useAuthStore()
// The error text to show; '' when the failure came without a message.
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
    error.value = err?.message || ''
    
    // Redirect to login after short delay
    setTimeout(() => {
      router.push({ name: ROUTE_NAMES.login })
    }, 3000)
  }
})
</script>

<template>
  <StatusPage>
    <StatusScreen v-if="error === null" loading :text="$t('auth.callback.working')" />
    <StatusScreen
      v-else
      tone="danger"
      :title="$t('auth.callback.errorTitle')"
      :text="error || $t('auth.callback.failed')"
    >
      <p class="text-sm text-fg-muted">{{ $t('auth.callback.redirecting') }}</p>
    </StatusScreen>
  </StatusPage>
</template>
