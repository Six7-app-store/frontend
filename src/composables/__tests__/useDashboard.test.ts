import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ stats: vi.fn(), toastError: vi.fn() }))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/api/dashboard.api', () => ({ dashboardApi: { stats: h.stats } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: h.toastError }) }))

import { useDashboard } from '@/composables/useDashboard'

describe('useDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fills the counters from the backend', async () => {
    h.stats.mockResolvedValue({ data: { deployments: 3, apps: 5, courses: 2 } })
    const { stats, fetchStats } = useDashboard()

    await fetchStats()

    expect(stats.value).toEqual({ deployments: 3, apps: 5, courses: 2, loading: false })
  })

  it('reports a failed load as a toast instead of rejecting', async () => {
    h.stats.mockRejectedValue(new Error('offline'))
    const { stats, fetchStats } = useDashboard()

    await expect(fetchStats()).resolves.toBeUndefined()
    expect(h.toastError).toHaveBeenCalledWith('DashboardView.statsLoadError')
    expect(stats.value.loading).toBe(false)
  })
})
