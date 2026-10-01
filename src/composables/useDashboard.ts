import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { dashboardApi } from '@/api/dashboard.api'
import { useToast } from '@/composables/useToast'

// ----------------------------------------------------------------
// USE DASHBOARD COMPOSABLE
// ----------------------------------------------------------------
export const useDashboard = () => {
  const { t } = useI18n()
  const toast = useToast()

  const stats = ref({
    deployments: 0,
    apps: 0,
    courses: 0,
    loading: true
  })

  const fetchStats = async () => {
    stats.value.loading = true

    try {
      const { data } = await dashboardApi.stats()
      stats.value.deployments = data.deployments
      stats.value.apps = data.apps
      stats.value.courses = data.courses
    } catch {
      // Handled here rather than rethrown: the dashboard fires this without
      // awaiting it, so a rethrow ended as an unhandled rejection.
      toast.error(t('DashboardView.statsLoadError'))
    } finally {
      stats.value.loading = false
    }
  }

  return {
    stats,
    fetchStats
  }
}
