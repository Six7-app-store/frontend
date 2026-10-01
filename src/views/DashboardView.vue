<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, Plus } from 'lucide-vue-next'
import { useDashboard } from '@/composables/useDashboard'
import { useQuotas } from '@/composables/useQuotas'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { useAuthStore } from '@/stores/auth.store'
import { useRouteAccess } from '@/composables/useRouteAccess'
import CredentialMissingBanner from '@/components/CredentialMissingBanner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Card from '@/components/ui/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import MeterBar from '@/components/ui/MeterBar.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatStrip, { type Stat } from '@/components/ui/StatStrip.vue'

const { stats, fetchStats } = useDashboard()
const {
  formattedQuotas,
  loading: quotasLoading,
  needsCredentials,
  hasCachedQuotas,
  fetchQuotas,
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

const greeting = computed(() => (firstName.value ? `${timeGreeting.value}, ${firstName.value}` : timeGreeting.value))

// Without credentials no deployment can be created, so the main action waits for them.
const credentialsMissing = computed(() => credStore.isResolved && !credStore.hasCredential)

const statItems = computed<Stat[]>(() => [
  { id: 'deployments', label: t('DashboardView.deployments'), value: stats.value.deployments, to: { name: ROUTE_NAMES.deploymentsList } },
  { id: 'apps', label: t('DashboardView.apps'), value: stats.value.apps, to: { name: ROUTE_NAMES.apps } },
  // Students have no access to courses (staff-only route), so their tile is left out instead of leading to a 403.
  ...(canAccess({ name: ROUTE_NAMES.courses })
    ? [{ id: 'courses', label: t('DashboardView.courses'), value: stats.value.courses, to: { name: ROUTE_NAMES.courses } }]
    : []),
])

type QuotaRow = (typeof formattedQuotas.value)[number]

const quotaColumns = computed<DataTableColumn[]>(() => [
  { id: 'label', label: t('DashboardView.resourceColumns.resource'), class: 'w-[200px]' },
  { id: 'used', label: t('DashboardView.resourceColumns.usedLimit'), class: 'w-[160px]' },
  { id: 'meter', label: t('DashboardView.resourceColumns.usage') },
  { id: 'percentage', label: t('DashboardView.resourceColumns.percent'), class: 'w-[88px]', align: 'right', hideLabel: true },
])

onMounted(() => {
  fetchStats()
  fetchQuotas()
  if (!credStore.status) credStore.fetch()
})
</script>

<template>
  <div class="max-w-page">
    <PageHeader size="greeting" :title="greeting">
      <template #actions>
        <BaseButton v-if="credentialsMissing" disabled :disabled-reason="t('DashboardView.deploymentNeedsCredentials')">
          {{ $t('DashboardView.deploymentNew') }}
        </BaseButton>
        <RouterLink v-else :to="{ name: ROUTE_NAMES.apps }" class="btn btn-primary">
          <Plus :size="16" :stroke-width="2.2" aria-hidden="true" />
          {{ $t('DashboardView.deploymentNew') }}
        </RouterLink>
      </template>
    </PageHeader>

    <div class="flex flex-col gap-section">
      <CredentialMissingBanner
        v-if="credentialsMissing"
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

      <StatStrip :items="statItems" :aria-label="t('DashboardView.statsLabel')" />

      <Card :title="t('DashboardView.availableResources')" flush>
        <template #actions>
          <Loader2
            v-if="quotasLoading && hasCachedQuotas"
            :size="14"
            class="animate-spin text-icon"
            aria-hidden="true"
          />
          <span v-if="formattedQuotas.length" class="flex gap-4 text-xs text-fg-muted">
            <span class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-[2px] bg-success-dot" aria-hidden="true" />{{ t('DashboardView.legendLow') }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-[2px] bg-warning-dot" aria-hidden="true" />{{ t('DashboardView.legendMid') }}
            </span>
          </span>
        </template>

        <!-- Skeleton (first load, nothing cached yet) -->
        <div v-if="quotasLoading && !hasCachedQuotas" data-testid="quota-skeleton" class="flex flex-col" aria-busy="true">
          <div v-for="i in 6" :key="i" class="flex h-12 animate-pulse items-center gap-6 border-t border-faint px-panel first:border-t-0">
            <div class="h-3 w-32 rounded-tag bg-line/[.07]" />
            <div class="h-3 w-16 rounded-tag bg-line/[.07]" />
            <div class="meter-track flex-1" />
          </div>
        </div>

        <DataTable
          v-else-if="formattedQuotas.length > 0"
          dense
          :columns="quotaColumns"
          :rows="formattedQuotas"
          :row-key="(quota: QuotaRow) => quota.label"
          :caption="t('DashboardView.availableResources')"
        >
          <template #cell-label="{ row }">
            <span class="font-semibold">{{ row.label }}</span>
          </template>
          <template #cell-used="{ row }">
            <span class="tabular-nums">
              <span class="text-heading">{{ row.used }}</span>
              <span class="text-fg-muted"> / {{ row.limit }}{{ row.unit ? ` ${row.unit}` : '' }}</span>
            </span>
          </template>
          <template #cell-meter="{ row }">
            <MeterBar :value="row.percentage" :label="row.label" />
          </template>
          <template #cell-percentage="{ row }">
            <span class="text-sm tabular-nums text-fg-muted">{{ row.percentage }} %</span>
          </template>
        </DataTable>

        <p v-else-if="needsCredentials || credentialsMissing" class="p-6 text-base text-fg-muted">
          {{ t('DashboardView.resourcesNeedCredentials') }}
        </p>

        <p v-else class="p-6 text-base text-fg-muted" role="alert">
          {{ t('DashboardView.quotaLoadError') }}
        </p>
      </Card>
    </div>
  </div>
</template>
