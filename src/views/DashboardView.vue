<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BarChart3, Layers, GraduationCap, ArrowRight,
  XCircle, Loader2, AlertCircle, Rocket
} from 'lucide-vue-next'
import { useDashboard } from '@/composables/useDashboard'
import { useQuotas } from '@/composables/useQuotas'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { useAuthStore } from '@/stores/auth.store'
import { useRouteAccess } from '@/composables/useRouteAccess'
import { useRole } from '@/composables/useRole'
import CredentialMissingBanner from '@/components/CredentialMissingBanner.vue'

const { stats, fetchStats } = useDashboard()
const {
  formattedQuotas,
  loading: quotasLoading,
  needsCredentials,
  hasCachedQuotas,
  fetchQuotas,
  getColorClass,
  getTextColorClass,
  isQuotaCritical,
} = useQuotas()
const credStore = useOpenStackCredentialsStore()
const authStore = useAuthStore()
const { t } = useI18n()
const { canAccess } = useRouteAccess()
// Credentials, quotas and the "new deployment" CTA all belong to creating
// a deployment — staff work. For a student they are not just useless, they
// advertise a path the backend refuses (``role_required``).
const { canUseOpenStack, canCreateDeployment } = useRole()

const firstName = computed(() => {
  const name = authStore.user?.username || ''
  return name.charAt(0).toUpperCase() + name.slice(1)
})

const timeGreeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('DashboardView.timeGreetings.morning')
  if (h < 18) return t('DashboardView.timeGreetings.afternoon')
  return t('DashboardView.timeGreetings.evening')
})

onMounted(() => {
  fetchStats()
  // Both calls end in a 412 for a student without credentials — and the
  // student is never meant to have any, so don't ask in the first place.
  if (!canUseOpenStack.value) return
  fetchQuotas()
  if (!credStore.status) credStore.fetch()
})
</script>

<template>
  <div class="space-y-6">

    <!-- Banners -->
    <CredentialMissingBanner
      v-if="canUseOpenStack && credStore.isResolved && !credStore.hasCredential"
      variant="warning"
      :title="t('banners.credentialsMissing.title')"
      :message="t('banners.credentialsMissing.message')"
      :cta="t('banners.credentialsMissing.cta')"
      :ctaTo="{ name: ROUTE_NAMES.userOpenStack }"
    />
    <CredentialMissingBanner
      v-else-if="canUseOpenStack && credStore.isResolved && credStore.lastError"
      variant="error"
      :title="t('banners.credentialsInvalid.title')"
      :message="credStore.lastError"
      :cta="t('banners.credentialsInvalid.cta')"
      :ctaTo="{ name: ROUTE_NAMES.userOpenStack }"
    />

    <!-- Hero banner -->
    <div class="hero-banner">
      <div class="hero-content">
        <p class="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{{ timeGreeting }}</p>
        <h1 class="text-white text-3xl font-bold mb-1">{{ firstName }}</h1>
        <p class="text-white/60 text-sm">{{ $t('DashboardView.subtitle') }}</p>
      </div>
      <!-- Staff start a deployment from the app catalogue; a student only
           opens what was assigned to them, so the CTA changes target and
           label rather than disappearing. -->
      <RouterLink
        v-if="canCreateDeployment"
        :to="{ name: ROUTE_NAMES.apps }"
        class="hero-cta group"
      >
        <Rocket :size="16" class="group-hover:translate-x-0.5 transition-transform" />
        {{ $t('DashboardView.deploymentNew') }}
      </RouterLink>
      <RouterLink
        v-else
        :to="{ name: ROUTE_NAMES.deploymentsList }"
        class="hero-cta group"
      >
        <BarChart3 :size="16" class="group-hover:translate-x-0.5 transition-transform" />
        {{ $t('DashboardView.environmentsOpen') }}
      </RouterLink>
    </div>

    <!-- KPI row -->
    <div class="kpi-row">
      <RouterLink :to="{ name: ROUTE_NAMES.deploymentsList }" class="kpi-item group">
        <div class="kpi-icon-wrap" style="background:rgba(49,113,83,0.10)">
          <BarChart3 :size="16" class="text-primary" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.deployments }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.deployments') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </RouterLink>

      <div class="kpi-divider" />

      <RouterLink :to="{ name: ROUTE_NAMES.apps }" class="kpi-item group">
        <div class="kpi-icon-wrap" style="background:rgba(228,140,42,0.10)">
          <Layers :size="16" class="text-accentYellow" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.apps }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.apps') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </RouterLink>

      <!-- Courses tile: students have no courses access (staff-only route),
           so hide the tile via RoleGate instead of 404 on click. -->
      <template v-if="canAccess({ name: ROUTE_NAMES.courses })">
      <div class="kpi-divider" />

      <RouterLink :to="{ name: ROUTE_NAMES.courses }" class="kpi-item group">
        <div class="kpi-icon-wrap" style="background:rgba(59,130,246,0.08)">
          <GraduationCap :size="16" class="text-blue-500" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.courses }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.courses') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </RouterLink>
      </template>
    </div>

    <!-- Available resources — full width, two-column quotas list.
         Quotas belong to the OpenStack project the credentials point at;
         without that surface there is nothing to show. -->
    <div v-if="canUseOpenStack" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <h2 class="text-sm font-semibold text-gray-900">{{ $t('DashboardView.availableResources') }}</h2>
        <span v-if="quotasLoading && hasCachedQuotas" class="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 :size="12" class="animate-spin" />
        </span>
      </div>

      <!-- Skeleton (initial load) -->
      <div v-if="quotasLoading && !hasCachedQuotas" class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <div v-for="i in 6" :key="i" class="animate-pulse space-y-2">
          <div class="flex justify-between">
            <div class="h-3 bg-gray-100 rounded w-20" />
            <div class="h-3 bg-gray-100 rounded w-10" />
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full" />
        </div>
      </div>

      <!-- Quotas: two columns on >= md -->
      <div v-else-if="formattedQuotas.length > 0" class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <div v-for="quota in formattedQuotas" :key="quota.label">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-1.5">
              <component :is="quota.icon" :size="13" class="text-gray-400" />
              <span class="text-xs font-medium text-gray-700">{{ quota.label }}</span>
            </div>
            <span
              class="text-xs font-semibold tabular-nums"
              :class="getTextColorClass(quota.percentage)"
            >
              {{ quota.used }}/{{ quota.limit }}{{ quota.unit }}
            </span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              :class="getColorClass(quota.percentage)"
              class="h-1.5 rounded-full transition-all duration-700"
              :style="{ width: `${quota.percentage}%` }"
            />
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <p class="text-xs text-gray-400">{{ t('DashboardView.quotaUsed', { percentage: quota.percentage }) }}</p>
            <AlertCircle v-if="isQuotaCritical(quota.percentage)" :size="11" class="text-red-400" />
          </div>
        </div>
      </div>
      <!-- No credentials -->
      <div v-else-if="needsCredentials" class="px-6 py-12 text-center">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <XCircle :size="22" class="text-gray-400" />
        </div>
        <p class="text-sm font-medium text-gray-700">{{ t('DashboardView.noCredentialsTitle') }}</p>
        <p class="text-xs text-gray-400 mt-1 mb-4">{{ t('DashboardView.noCredentialsHint') }}</p>
        <RouterLink
          :to="{ name: ROUTE_NAMES.userOpenStack }"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primaryDark transition-colors"
        >
          {{ t('DashboardView.setUpNow') }} <ArrowRight :size="12" />
        </RouterLink>
      </div>

      <!-- Error / no data -->
      <div v-else class="px-6 py-12 text-center">
        <p class="text-sm text-gray-400">{{ t('DashboardView.quotaLoadError') }}</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Hero */
.hero-banner {
  background: linear-gradient(135deg, #317153 0%, #1e4a32 60%, #173325 100%);
  border-radius: 20px;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.hero-banner::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 200px;
  height: 200px;
  background: rgba(255,255,255,0.04);
  border-radius: 50%;
}

.hero-banner::after {
  content: '';
  position: absolute;
  bottom: -60px;
  right: 80px;
  width: 160px;
  height: 160px;
  background: rgba(255,255,255,0.03);
  border-radius: 50%;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-cta {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 12px;
  text-decoration: none;
  transition: background 150ms, border-color 150ms;
  white-space: nowrap;
}

.hero-cta:hover {
  background: rgba(255,255,255,0.22);
  border-color: rgba(255,255,255,0.35);
}

/* KPI row */
.kpi-row {
  background: white;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  /* Flex, not a fixed five-track grid: the courses tile is hidden for
     students, and the grid left the two remaining tiles squeezed against
     the left edge with the unused tracks eating the rest of the row. */
  display: flex;
  overflow: hidden;
}

.kpi-item {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  text-decoration: none;
  transition: background 150ms;
}

.kpi-item:hover {
  background: #fafafa;
}

.kpi-divider {
  flex: 0 0 1px;
  width: 1px;
  background: #f0f0f0;
  margin: 12px 0;
}

.kpi-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-num {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.kpi-lbl {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-top: 3px;
}
</style>
