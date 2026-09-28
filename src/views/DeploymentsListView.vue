<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { onMounted, computed } from 'vue'

import {
  BarChart3,
  Plus,
  Inbox,
  GitBranch,
  Box,
  Clock,
  ArrowRight,
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Card from '@/components/ui/Card.vue'
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

onMounted(async () => {
  deploymentStore.fetchDeployments()
  appStore.fetchApps()
})

const getAppName = (appId: string) => {
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
const studentStateColor = (status: string | null | undefined) =>
  ({
    ready: 'status-success',
    preparing: 'status-warning',
    unavailable: 'status-neutral',
  })[studentState(status)]

</script>


<template>
  <div class="p-6">
    <!-- "Meine Umgebungen" for students: they were assigned one, they did
         not deploy it, and "Deployment" is not a word they need. -->
    <PageHeader
      :title="isStudent ? $t('DeploymentsView.titleStudent') : $t('DeploymentsView.title')"
      :subtitle="isStudent ? $t('DeploymentsView.subtitleStudent') : $t('DeploymentsView.subtitle')"
    >
      <template #actions>
        <!-- Staff only. A student clicking this would walk into the wizard
             and hit a 403 on the final POST. -->
        <RouterLink v-if="isStaff" :to="{ name: ROUTE_NAMES.apps }">
          <BaseButton class="flex items-center gap-2">
            <Plus :size="16" />
            {{ $t('DeploymentsView.newDeployment') }}
          </BaseButton>
        </RouterLink>
      </template>
    </PageHeader>

    <EntityListState
      :is-loading="deploymentStore.isLoading && deploymentStore.deployments.length === 0"
      :is-empty="!deploymentStore.isLoading && deploymentStore.deployments.length === 0"
      :icon="Inbox"
      :empty-message="isStudent
        ? $t('DeploymentsView.emptyStudent')
        : $t('DeploymentsView.deploymentsMissingMessage')"
    >
      <template #empty-action>
        <RouterLink v-if="isStaff" :to="{ name: ROUTE_NAMES.apps }">
          <BaseButton class="flex items-center gap-2">
            <Plus :size="16" />
            {{ $t('DeploymentsView.newDeployment') }}
          </BaseButton>
        </RouterLink>
        <!-- No button for students — there is nothing for them to do
             here. Name who acts next instead of leaving a dead end. -->
        <p v-else class="text-sm text-fg-muted">
          {{ $t('DeploymentsView.emptyStudentHint') }}
        </p>
      </template>

      <!-- Card grid, one card per deployment (name, app name, status pill,
           release tag, creation date). Click opens the detail; newest first. -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RouterLink
          v-for="deployment in sortedDeployments"
          :key="deployment.deploymentId"
          :to="{ name: ROUTE_NAMES.deploymentsDetail, params: { id: deployment.deploymentId } }"
          class="block"
        >
          <Card class="flex flex-col h-full cursor-pointer hover:border-strong transition">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-control bg-line/[.07] border border-subtle flex items-center justify-center flex-shrink-0">
                  <BarChart3 :size="20" class="text-icon" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-fg truncate" :title="deployment.name">
                    {{ deployment.name }}
                  </h3>
                  <p class="text-xs text-fg-muted truncate mt-0.5">
                    <Box :size="11" class="inline-block mr-1 align-text-bottom" />
                    {{ getAppName(deployment.appId) }}
                  </p>
                </div>
              </div>
              <!-- Students get three states, staff get the raw lifecycle. -->
              <span
                v-if="isStudent"
                class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap"
                :class="studentStateColor(deployment.status)"
                :title="studentState(deployment.status) === 'unavailable'
                  ? $t('DeploymentsView.studentUnavailableHint')
                  : undefined"
              >
                {{ $t(studentStateLabel(deployment.status)) }}
              </span>
              <StatusBadge v-else :status="deployment.status" />
            </div>

            <!-- Student footer: the one question they have is "how do I
                 get in". Release tag and creation date answer a question
                 only the person who built it asks. -->
            <div
              v-if="isStudent"
              class="mt-auto pt-3 border-t border-subtle flex items-center justify-between text-xs"
            >
              <span
                v-if="studentState(deployment.status) === 'unavailable'"
                class="text-fg-muted"
              >
                {{ $t('DeploymentsView.studentUnavailableHint') }}
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 font-medium text-fg"
              >
                {{ $t('DeploymentsView.studentOpenAccess') }}
                <ArrowRight :size="12" />
              </span>
            </div>

            <div
              v-else
              class="mt-auto pt-3 border-t border-subtle flex items-center justify-between text-xs text-fg-muted"
            >
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-line/[.04] text-fg border border-subtle font-mono">
                <GitBranch :size="11" />
                {{ deployment.releaseTag }}
              </span>
              <span class="inline-flex items-center gap-1">
                <Clock :size="11" />
                {{ formatCreatedAt(deployment.created_at) }}
              </span>
            </div>
          </Card>
        </RouterLink>
      </div>
    </EntityListState>
  </div>
</template>
