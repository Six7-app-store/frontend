<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, onMounted, computed } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EntityListState from '@/components/ui/EntityListState.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import type { SegmentOption } from '@/components/ui/segment'
import AppCard from '@/components/app/AppCard.vue'
import { useAppCatalog } from '@/composables/useAppCatalog'
import { useI18n } from 'vue-i18n'
import { Globe, Inbox, Plus, Lock } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { storeApprovalState } from '@/services/app-presentation.service'
import { useAuthStore } from '@/stores/auth.store'
import { useRole } from '@/composables/useRole'
import type { AppVersionBadgeStatus } from '@/types'

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const { isAdmin } = useRole()

const { apps, approvals: approvalsMap, isLoading, load } = useAppCatalog()

type VisibilityFilter = 'all' | 'public' | 'private'

// Admin-only filter
const visibilityFilter = ref<VisibilityFilter>('all')
const filterOptions = computed<SegmentOption<VisibilityFilter>[]>(() => [
  { value: 'all', label: t('AppsView.filterAll') },
  { value: 'public', label: t('AppsView.filterPublic'), icon: Globe },
  { value: 'private', label: t('AppsView.filterPrivate'), icon: Lock },
])

const filteredApps = computed(() => {
  if (!isAdmin.value || visibilityFilter.value === 'all') return apps.value
  if (visibilityFilter.value === 'private') return apps.value.filter(a => a.is_private)
  return apps.value.filter(a => !a.is_private)
})

const isOwnApp = (app: any) => String(app.userId) === String(authStore.userId)

const badgeStatusForApp = (app: any): AppVersionBadgeStatus | null => {
  if (!isOwnApp(app)) return null
  if (app.is_private) return 'private'
  const approvals = approvalsMap.value[app.appId] ?? []
  return ({ approved: 'published', pending: 'pending', none: 'new' } as const)[storeApprovalState(approvals)]
}

const cards = computed(() => filteredApps.value.map((app) => ({ app, status: badgeStatusForApp(app) })))

const fetchApps = async () => {
  try {
    await load({ approvalsFor: isOwnApp })
  } catch (error) {
    console.error('Fehler beim Laden der Apps:', error)
    toast.error(t('AppsView.loadError'))
  }
}

onMounted(() => {
  fetchApps()
})
</script>

<template>
  <div class="max-w-page">
    <PageHeader :title="$t('AppsView.title')" :subtitle="$t('AppsView.subtitle')">
      <template #actions>
        <SegmentedControl
          v-if="isAdmin"
          v-model="visibilityFilter"
          size="md"
          :options="filterOptions"
          :ariaLabel="$t('AppsView.filterLabel')"
        />
        <RouterLink :to="{ name: ROUTE_NAMES.appsCreate }" class="btn btn-primary">
          <Plus :size="16" :stroke-width="2.2" aria-hidden="true" />
          {{ $t('AppsView.addApp') }}
        </RouterLink>
      </template>
    </PageHeader>

    <EntityListState
      :is-loading="isLoading && apps.length === 0"
      :is-empty="!isLoading && filteredApps.length === 0"
      :icon="Inbox"
      :empty-message="visibilityFilter === 'private' ? $t('AppsView.noPrivateApps') : visibilityFilter === 'public' ? $t('AppsView.noPublicApps') : $t('AppsView.noAppsDesc')"
      :loading-message="$t('AppsView.loading')"
    >
      <template #empty-action>
        <RouterLink v-if="visibilityFilter === 'all'" :to="{ name: ROUTE_NAMES.appsCreate }" class="btn btn-primary">
          <Plus :size="16" :stroke-width="2.2" aria-hidden="true" />
          {{ $t('AppsView.addApp') }}
        </RouterLink>
      </template>

      <ul class="grid grid-cols-1 gap-card md:grid-cols-2 lg:grid-cols-3">
        <li v-for="{ app, status } in cards" :key="app.appId">
          <AppCard
            :name="app.name"
            :description="app.description"
            :status="status"
            :to="{ name: ROUTE_NAMES.appsDetail, params: { id: app.appId } }"
            :empty-text="$t('AppsView.noDescription')"
          />
        </li>
      </ul>
    </EntityListState>
  </div>
</template>
