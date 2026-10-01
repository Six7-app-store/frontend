import { ref } from 'vue'
import { dashboardApi } from '@/api/dashboard.api'

// ----------------------------------------------------------------
// USE DASHBOARD COMPOSABLE
// ----------------------------------------------------------------
export const useDashboard = () => {
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
    } catch (err) {
      console.error("Dashboard stats error:", err)
      throw err
    } finally {
      stats.value.loading = false
    }
  }

  return {
    stats,
    fetchStats
  }
}
