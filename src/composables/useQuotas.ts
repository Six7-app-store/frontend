import { ref, computed } from 'vue'
import axios from 'axios'
import { Cpu, HardDrive, Network } from 'lucide-vue-next'
import { quotasApi } from '@/api/quotas.api'
import i18n from '@/i18n'
import { getErrorStatus } from '@/utils/http-error'
import type { QuotaOverview } from '@/types/quota'

// ----------------------------------------------------------------
// MODULE-SCOPED STATE (shared across all consumers)
// ----------------------------------------------------------------
// Why module-scoped: the dashboard mounts/unmounts whenever the user
// navigates, but we want the quota tile to keep showing the last known
// numbers while the next fetch is in flight instead of flashing the
// loading skeleton again. Lifting state above the composable factory is
// the cheapest way to share it; sessionStorage extends that across
// reloads inside the same browser session.
const STORAGE_KEY = 'openstack.quotas.v1'

function readCachedQuotas(): QuotaOverview | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QuotaOverview
  } catch {
    // Unreadable cache entry: behave as if nothing was cached.
    return null
  }
}

function writeCachedQuotas(value: QuotaOverview | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sessionStorage may be unavailable (private mode, quota) — degrade silently
  }
}

/**
 * One scale for every quota indicator: the bar, the used/limit text and the
 * warning icon. The dashboard used to carry its own thresholds (60/80), which
 * made a bar look merely "warm" while the number next to it was already red.
 */
const QUOTA_THRESHOLDS = {
  /** From here the usage is noticeable. */
  notable: 50,
  /** From here it gets tight — bar orange, number amber. */
  high: 75,
  /** From here it is critical — bar and number red, warning icon. */
  critical: 90,
} as const

const quotas = ref<QuotaOverview | null>(readCachedQuotas())
const loading = ref(false)
const error = ref<string | null>(null)
const needsCredentials = ref(false)

// ----------------------------------------------------------------
// USE QUOTAS COMPOSABLE
// ----------------------------------------------------------------
// The composable is also used outside of a component setup (e.g. in unit
// tests), so it reads the global i18n instance instead of ``useI18n()``.
const t = (key: string) => i18n.global.t(key)

export const useQuotas = () => {
  const getPercentage = (used: number, limit: number): number => {
    if (limit === 0) return 0
    return Math.round((used / limit) * 100)
  }

  const getColorClass = (percentage: number): string => {
    if (percentage >= QUOTA_THRESHOLDS.critical) return 'bg-red-500'
    if (percentage >= QUOTA_THRESHOLDS.high) return 'bg-orange-500'
    if (percentage >= QUOTA_THRESHOLDS.notable) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  /** Colour of the used/limit number, on the same scale as the bar. */
  const getTextColorClass = (percentage: number): string => {
    if (percentage >= QUOTA_THRESHOLDS.critical) return 'text-red-500'
    if (percentage >= QUOTA_THRESHOLDS.high) return 'text-amber-500'
    return 'text-gray-600'
  }

  /** True when the usage deserves the warning icon. */
  const isQuotaCritical = (percentage: number): boolean =>
    percentage >= QUOTA_THRESHOLDS.critical

  const formattedQuotas = computed(() => {
    if (!quotas.value) return []

    const { compute, storage, network } = quotas.value

    return [
      {
        icon: Cpu,
        label: t('DashboardView.quotas.instances'),
        used: compute.instances.used,
        limit: compute.instances.limit,
        percentage: getPercentage(compute.instances.used, compute.instances.limit),
        unit: ''
      },
      {
        icon: Cpu,
        label: t('DashboardView.quotas.vcpus'),
        used: compute.vcpus.used,
        limit: compute.vcpus.limit,
        percentage: getPercentage(compute.vcpus.used, compute.vcpus.limit),
        unit: ''
      },
      {
        icon: Cpu,
        label: t('DashboardView.quotas.ram'),
        used: Math.round(compute.ram.used / 1024),
        limit: Math.round(compute.ram.limit / 1024),
        percentage: getPercentage(compute.ram.used, compute.ram.limit),
        unit: 'GB'
      },
      {
        icon: HardDrive,
        label: t('DashboardView.quotas.volumes'),
        used: storage.volumes.used,
        limit: storage.volumes.limit,
        percentage: getPercentage(storage.volumes.used, storage.volumes.limit),
        unit: ''
      },
      {
        icon: HardDrive,
        label: t('DashboardView.quotas.storage'),
        used: storage.gigabytes.used,
        limit: storage.gigabytes.limit,
        percentage: getPercentage(storage.gigabytes.used, storage.gigabytes.limit),
        unit: 'GB'
      },
      {
        icon: Network,
        label: t('DashboardView.quotas.floatingIps'),
        used: network.floating_ips.used,
        limit: network.floating_ips.limit,
        percentage: getPercentage(network.floating_ips.used, network.floating_ips.limit),
        unit: ''
      }
    ]
  })

  const hasCachedQuotas = computed(() => quotas.value !== null)

  const fetchQuotas = async () => {
    loading.value = true
    error.value = null
    needsCredentials.value = false

    try {
      const response = await quotasApi.getOverview()
      quotas.value = response.data
      writeCachedQuotas(response.data)
    } catch (err) {
      if (axios.isAxiosError(err) && getErrorStatus(err) === 412) {
        needsCredentials.value = true
        // Drop the cache: credentials are gone, the old numbers don't apply
        quotas.value = null
        writeCachedQuotas(null)
      } else {
        error.value = t('DashboardView.quotaLoadError')
        console.error('Quota fetch error:', err)
        // Keep the existing cached numbers visible — a transient error
        // shouldn't blank out the tile.
      }
    } finally {
      loading.value = false
    }
  }

  return {
    quotas,
    loading,
    error,
    needsCredentials,
    formattedQuotas,
    hasCachedQuotas,
    fetchQuotas,
    getColorClass,
    getTextColorClass,
    isQuotaCritical
  }
}
