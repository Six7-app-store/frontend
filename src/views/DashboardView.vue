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
  fetchQuotas()
  if (!credStore.status) credStore.fetch()
})
</script>

<template>
  <div class="space-y-6">

    <!-- Banners -->
    <CredentialMissingBanner
      v-if="credStore.isResolved && !credStore.hasCredential"
      variant="warning"
      :title="t('banners.credentialsMissing.title')"
      :message="t('banners.credentialsMissing.message')"
      :cta="t('banners.credentialsMissing.cta')"
      :ctaTo="{ name: ROUTE_NAMES.userOpenStack }"
    />
    <CredentialMissingBanner
      v-else-if="credStore.isResolved && credStore.lastError"
      variant="error"
      :title="t('banners.credentialsInvalid.title')"
      :message="credStore.lastError"
      :cta="t('banners.credentialsInvalid.cta')"
      :ctaTo="{ name: ROUTE_NAMES.userOpenStack }"
    />

    <!-- Hero banner -->
    <div class="surface-banner hero-banner">
      <div>
        <p class="text-fg-muted text-xs font-semibold uppercase tracking-[0.08em] mb-2">{{ timeGreeting }}</p>
        <h1 class="text-fg text-[28px] leading-tight font-semibold tracking-[-0.01em] mb-2">{{ firstName }}</h1>
        <p class="text-fg-muted text-sm">{{ $t('DashboardView.subtitle') }}</p>
      </div>
      <RouterLink
        :to="{ name: ROUTE_NAMES.apps }"
        class="btn-primary group inline-flex items-center gap-2 h-10 px-5 rounded-control text-sm font-semibold whitespace-nowrap"
      >
        <Rocket :size="16" class="group-hover:translate-x-0.5 transition-transform" />
        {{ $t('DashboardView.deploymentNew') }}
      </RouterLink>
    </div>

    <!-- KPI row -->
    <div class="surface-panel kpi-row">
      <RouterLink :to="{ name: ROUTE_NAMES.deploymentsList }" class="kpi-item group">
        <div class="kpi-icon-wrap">
          <BarChart3 :size="16" class="text-icon" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.deployments }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.deployments') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-icon group-hover:text-fg group-hover:translate-x-0.5 transition-all" />
      </RouterLink>

      <div class="kpi-divider" />

      <RouterLink :to="{ name: ROUTE_NAMES.apps }" class="kpi-item group">
        <div class="kpi-icon-wrap">
          <Layers :size="16" class="text-icon" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.apps }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.apps') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-icon group-hover:text-fg group-hover:translate-x-0.5 transition-all" />
      </RouterLink>

      <!-- Courses tile: students have no courses access (staff-only route),
           so hide the tile via RoleGate instead of 404 on click. -->
      <template v-if="canAccess({ name: ROUTE_NAMES.courses })">
      <div class="kpi-divider" />

      <RouterLink :to="{ name: ROUTE_NAMES.courses }" class="kpi-item group">
        <div class="kpi-icon-wrap">
          <GraduationCap :size="16" class="text-icon" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.courses }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.courses') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-icon group-hover:text-fg group-hover:translate-x-0.5 transition-all" />
      </RouterLink>
      </template>
    </div>

    <!-- Available resources — full width, two-column quotas list -->
    <div class="surface-panel overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-subtle">
        <h2 class="text-[15px] font-semibold text-fg">{{ $t('DashboardView.availableResources') }}</h2>
        <span v-if="quotasLoading && hasCachedQuotas" class="flex items-center gap-1.5 text-xs text-fg-muted">
          <Loader2 :size="12" class="animate-spin" />
        </span>
      </div>

      <!-- Skeleton (initial load) -->
      <div v-if="quotasLoading && !hasCachedQuotas" class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <div v-for="i in 6" :key="i" class="animate-pulse space-y-2">
          <div class="flex justify-between">
            <div class="h-3 bg-line/[.07] rounded w-20" />
            <div class="h-3 bg-line/[.07] rounded w-10" />
          </div>
          <div class="meter-track h-2" />
        </div>
      </div>

      <!-- Quotas: two columns on >= md -->
      <div v-else-if="formattedQuotas.length > 0" class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <div v-for="quota in formattedQuotas" :key="quota.label">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-1.5">
              <component :is="quota.icon" :size="13" class="text-fg-muted" />
              <span class="text-xs font-medium text-fg">{{ quota.label }}</span>
            </div>
            <span
              class="text-xs font-semibold tabular-nums"
              :class="getTextColorClass(quota.percentage)"
            >
              {{ quota.used }}/{{ quota.limit }}{{ quota.unit }}
            </span>
          </div>
          <div class="meter-track w-full h-2">
            <div
              :class="getColorClass(quota.percentage)"
              class="h-full transition-all duration-700"
              :style="{ width: `${quota.percentage}%` }"
            />
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <p class="text-xs text-fg-muted">{{ t('DashboardView.quotaUsed', { percentage: quota.percentage }) }}</p>
            <AlertCircle v-if="isQuotaCritical(quota.percentage)" :size="11" class="text-danger" />
          </div>
        </div>
      </div>
      <!-- No credentials -->
      <div v-else-if="needsCredentials" class="px-6 py-12 text-center">
        <div class="w-12 h-12 rounded-full bg-line/[.07] flex items-center justify-center mx-auto mb-3">
          <XCircle :size="22" class="text-icon" />
        </div>
        <p class="text-sm font-medium text-fg">{{ t('DashboardView.noCredentialsTitle') }}</p>
        <p class="text-xs text-fg-muted mt-1 mb-4">{{ t('DashboardView.noCredentialsHint') }}</p>
        <RouterLink
          :to="{ name: ROUTE_NAMES.userOpenStack }"
          class="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-control transition"
        >
          {{ t('DashboardView.setUpNow') }} <ArrowRight :size="12" />
        </RouterLink>
      </div>

      <!-- Error / no data -->
      <div v-else class="px-6 py-12 text-center">
        <p class="text-sm text-fg-muted">{{ t('DashboardView.quotaLoadError') }}</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.hero-banner {
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.kpi-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  overflow: hidden;
}

.kpi-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  text-decoration: none;
  transition: background 150ms;
}

.kpi-item:hover {
  background: var(--nav-hover-bg);
}

.kpi-divider {
  width: 1px;
  background: var(--line-subtle);
  margin: 16px 0;
}

.kpi-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--segment-bg);
  border: 1px solid var(--line-subtle);
}

.kpi-num {
  font-size: 2rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-fg));
  line-height: 1;
}

.kpi-lbl {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-fg-muted));
  margin-top: 4px;
}
</style>
