import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Composable for Auth Helpers (Keycloak)
 */
export function useAuth() {
  const authStore = useAuthStore()

  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.isLoading)

  const login = async (returnUrl?: string) => {
    await authStore.login(returnUrl)
  }

  const logout = async () => {
    await authStore.logout()
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}
