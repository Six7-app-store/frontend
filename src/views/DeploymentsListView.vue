<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { onMounted, computed } from 'vue'

import { ChevronRight, Inbox, Plus } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import DeploymentStatusBadge from '@/components/deployment/DeploymentStatusBadge.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { StatusTone } from '@/types/tone'
import PageHeader from '@/components/ui/PageHeader.vue'
import EntityListState from '@/components/ui/EntityListState.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useRole } from '@/composables/useRole'
import { formatDateTime } from '@/utils/format'

const deploymentStore = useDeploymentStore()
const appStore = useAppStore()

// One page, two audiences. Staff see the deployments they created and
// can start a new one; students see the environments they were picked
// into and cannot create anything (the backend rejects the create with
// ``role_required``). Everything role-dependent below reads from here.
const { isStaff, isStudent } = useRole()
const { t } = useI18n()

type Deployment = (typeof deploymentStore.deployments)[number]

// Students see the same grid, without the columns only the person who built it cares about.
const columns = computed<DataTableColumn[]>(() => [
  { id: 'name', label: t('DeploymentsView.columns.name') },
  { id: 'app', label: t('DeploymentsView.columns.app') },
  ...(isStudent.value
    ? [
        { id: 'status', label: t('DeploymentsView.columns.status'), class: 'w-[160px]' },
        { id: 'hint', label: t('DeploymentsView.columns.open'), class: 'w-[280px]', hideLabel: true },
      ]
    : [
        { id: 'version', label: t('DeploymentsView.columns.version'), class: 'w-[120px]' },
        { id: 'status', label: t('DeploymentsView.columns.status'), class: 'w-[140px]' },
        { id: 'created', label: t('DeploymentsView.columns.created'), class: 'w-[180px]' },
      ]),
  { id: 'open', label: t('DeploymentsView.columns.open'), class: 'w-12', hideLabel: true },
])

onMounted(async () => {
  deploymentStore.fetchDeployments()
  appStore.fetchApps()
})

const isEmpty = computed(() => !deploymentStore.isLoading && deploymentStore.deployments.length === 0)

const getAppName =(appId: string) => {
  const app = appStore.apps.find(a => a.appId === appId)
  return app ? app.name : '-'
}

// Creation time in the list: date + time, without seconds.
const formatCreatedAt = (dateString: string) =>
  formatDateTime(dateString, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Sort newest deployments first.
 *
 * The server returns the list in DB insert order, so we sort client-side by
 * ``created_at`` descending. Items without ``created_at`` fall to the end
 * (better than ``NaN`` in the comparison).
 */
const sortedDeployments = computed(() =>
  [...deploymentStore.deployments].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })
)

/**
 * Collapse the twelve lifecycle states into the three a student can act
 * on. The full set — destroying, pause_failed, resume_failed and the
 * rest — describes work only staff can do anything about; showing it to
 * a student produces support requests, not insight.
 *
 *   ready       → the environment is up, credentials are retrievable
 *   preparing   → something is in flight (including "no task yet")
 *   unavailable → everything else, staff has to look at it
 */
type StudentState = 'ready' | 'preparing' | 'unavailable'

const studentState = (status: string | null | undefined): StudentState => {
  if (status === 'success') return 'ready'
  // ``null`` means the deployment row exists but no task has been
  // recorded yet — dispatch in flight, which is "preparing", not broken.
  if (!status || status === 'pending' || status === 'running' || status === 'resuming') {
    return 'preparing'
  }
  return 'unavailable'
}

const studentStateLabel = (status: string | null | undefined) =>
  ({
    ready: 'DeploymentsView.studentReady',
    preparing: 'DeploymentsView.studentPreparing',
    unavailable: 'DeploymentsView.studentUnavailable',
  })[studentState(status)]

// Deliberately no red. A student did not break anything, so an alarm
// colour would only make them think they did.
const studentStateTone = (status: string | null | undefined): StatusTone =>
  ({
    ready: 'success',
    preparing: 'warning',
    unavailable: 'neutral',
  } as const)[studentState(status)]

</script>


<template>
  <div class="max-w-page">
    <!-- "Meine Umgebungen" for students: they were assigned one, they did
         not deploy it, and "Deployment" is not a word they need. -->
    <PageHeader
      :title="isStudent ? $t('DeploymentsView.titleStudent') : $t('DeploymentsView.title')"
      :subtitle="isStudent ? $t('DeploymentsView.subtitleStudent') : $t('DeploymentsView.subtitle')"
    >
      <template #actions>
        <!-- Staff only. A student clicking this would walk into the wizard
             and hit a 403 on the final POST. Hidden on an empty list, where
             the empty state already carries the same button. -->
        <RouterLink v-if="isStaff && !isEmpty" :to="{ name: ROUTE_NAMES.apps }" class="btn btn-primary">
          <Plus :size="16" :stroke-width="2.2" aria-hidden="true" />
          {{ $t('DeploymentsView.newDeployment') }}
        </RouterLink>
      </template>
    </PageHeader>

    <EntityListState
      :is-loading="deploymentStore.isLoading && deploymentStore.deployments.length === 0"
      :is-empty="isEmpty"
      :icon="Inbox"
      :empty-message="isStudent
        ? $t('DeploymentsView.emptyStudent')
        : $t('DeploymentsView.deploymentsMissingMessage')"
    >
      <template #empty-action>
        <RouterLink v-if="isStaff" :to="{ name: ROUTE_NAMES.apps }" class="btn btn-primary">
          <Plus :size="16" :stroke-width="2.2" aria-hidden="true" />
          {{ $t('DeploymentsView.newDeployment') }}
        </RouterLink>
        <!-- No button for students — there is nothing for them to do
             here. Name who acts next instead of leaving a dead end. -->
        <p v-else class="text-sm text-fg-muted">
          {{ $t('DeploymentsView.emptyStudentHint') }}
        </p>
      </template>

      <!-- One row per deployment, newest first; the whole row opens the detail. -->
      <div class="surface-panel overflow-hidden">
        <DataTable
          :columns="columns"
          :rows="sortedDeployments"
          :row-key="(d: Deployment) => d.deploymentId"
          :row-to="(d: Deployment) => ({ name: ROUTE_NAMES.deploymentsDetail, params: { id: d.deploymentId } })"
          :caption="isStudent ? $t('DeploymentsView.titleStudent') : $t('DeploymentsView.title')"
        >
          <template #cell-name="{ row }">
            <span class="font-semibold text-heading" data-testid="deployment-name">{{ row.name }}</span>
          </template>
          <template #cell-app="{ row }">
            <span class="text-fg-muted">{{ getAppName(row.appId) }}</span>
          </template>
          <template #cell-version="{ row }">
            <span class="font-mono text-sm">{{ row.releaseTag }}</span>
          </template>
          <template #cell-status="{ row }">
            <!-- Students get three states, staff get the raw lifecycle. -->
            <StatusBadge
              v-if="isStudent"
              :tone="studentStateTone(row.status)"
              :title="studentState(row.status) === 'unavailable' ? $t('DeploymentsView.studentUnavailableHint') : undefined"
            >
              {{ $t(studentStateLabel(row.status)) }}
            </StatusBadge>
            <DeploymentStatusBadge v-else :status="row.status" />
          </template>
          <template #cell-created="{ row }">
            <span class="tabular-nums text-fg-muted">{{ formatCreatedAt(row.created_at) }}</span>
          </template>
          <template #cell-hint="{ row }">
            <span v-if="studentState(row.status) === 'unavailable'" class="text-sm text-fg-muted">
              {{ $t('DeploymentsView.studentUnavailableHint') }}
            </span>
            <span v-else class="text-sm text-nav">{{ $t('DeploymentsView.studentOpenAccess') }}</span>
          </template>
          <template #cell-open>
            <ChevronRight :size="16" class="text-disabled" aria-hidden="true" />
          </template>
        </DataTable>
      </div>
    </EntityListState>
  </div>
</template>
