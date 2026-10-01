<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LogIn } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Get return URL from query params
const returnUrl = (route.query.returnUrl as string) || router.resolve({ name: ROUTE_NAMES.dashboard }).fullPath

// Redirect to Keycloak login
const loginWithKeycloak = async () => {
  try {
    await authStore.login(returnUrl)
  } catch (err: any) {
    // The user simply stays on the login page and can retry; only log it.
    console.error('Login redirect failed:', err)
  }
}

// Auto-redirect if already authenticated
onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push(returnUrl)
  }
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <h1 class="text-5xl font-semibold tracking-[-0.01em] text-heading">
      {{ $t('auth.login.title') }}
    </h1>
    <p class="text-md text-fg-muted">{{ $t('auth.login.keycloakInfo') }}</p>
  </div>

  <BaseButton size="lg" type="button" class="w-full" @click="loginWithKeycloak">
    <LogIn :size="16" aria-hidden="true" />
    {{ $t('auth.login.keycloakButton') }}
  </BaseButton>

  <p class="text-sm text-fg-muted">{{ $t('auth.login.noAccount') }}</p>
</template>
