<script setup lang="ts">
/**
 * One app in the admins' review queue: a row with the pending count that
 * expands into its submitted versions with approve, reject and revoke.
 * Loading the approvals and deciding is the view's job.
 */
import { ChevronDown, ChevronRight, Check, X, RotateCcw, ExternalLink } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-names'
import Spinner from '@/components/ui/Spinner.vue'
import AppVersionStatusBadge from '@/components/app/AppVersionStatusBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { formatDate } from '@/utils/format'
import type { App, AppVersionApproval } from '@/types'

const props = defineProps<{
  app: App
  expanded: boolean
  pendingCount: number | undefined
  /** Approvals of this app; undefined until loaded. */
  approvals: AppVersionApproval[] | undefined
  loading: boolean | undefined
  /** ``appId:versionTag`` of the decision in flight, if any. */
  actingOn: string | null
}>()

defineEmits<{
  toggle: []
  approve: [versionTag: string]
  reject: [versionTag: string]
  revoke: [versionTag: string]
}>()

const busy = (versionTag: string) => props.actingOn === `${props.app.appId}:${versionTag}`
</script>

<template>
  <div>
    <!-- App row (header) -->
    <button
      type="button"
      class="hover-tint flex w-full items-center gap-4 px-panel py-4 text-left"
      :aria-expanded="expanded"
      @click="$emit('toggle')"
    >
      <component
        :is="expanded ? ChevronDown : ChevronRight"
        :size="18"
        class="shrink-0 text-icon"
        aria-hidden="true"
      />

      <!-- App name -->
      <span class="flex-grow font-semibold text-heading">{{ app.name }}</span>

      <!-- Link to app detail -->
      <RouterLink
        :to="{ name: ROUTE_NAMES.appsDetail, params: { id: app.appId } }"
        class="btn btn-ghost btn-icon"
        :title="$t('AdminAppsView.goToApp')"
        :aria-label="$t('AdminAppsView.goToApp')"
        @click.stop
      >
        <ExternalLink :size="15" aria-hidden="true" />
      </RouterLink>

      <!-- Pending badge -->
      <StatusBadge v-if="pendingCount && !app.is_private" tone="warning">
        {{ pendingCount }} {{ $t('AdminAppsView.pendingLabel') }}
      </StatusBadge>
      <span v-else-if="app.is_private" class="text-sm text-fg-muted">
        {{ $t('AdminAppsView.privateLabel') }}
      </span>
      <span v-else class="text-sm text-fg-muted">
        {{ $t('AdminAppsView.noPendingLabel') }}
      </span>
    </button>

    <!-- Expanded: versions -->
    <div v-if="expanded" class="border-t border-faint bg-line/[.02]">

      <!-- Private app: no pending submissions shown -->
      <div
        v-if="app.is_private"
        class="px-6 py-4 text-sm text-fg-muted italic"
      >
        {{ $t('AdminAppsView.privateAppNote') }}
      </div>

      <!-- Loading approvals -->
      <div v-else-if="loading" class="flex justify-center py-6">
        <Spinner :size="20" />
      </div>

      <!-- No entries -->
      <div
        v-else-if="!(approvals ?? []).length"
        class="px-6 py-4 text-sm text-fg-muted italic"
      >
        {{ $t('AdminAppsView.noVersionsSubmitted') }}
      </div>

      <!-- Version table -->
      <div v-else class="px-panel pb-3">
      <table class="w-full text-base">
        <thead>
          <tr>
            <th class="px-2 pb-2 pt-3 text-left text-xs font-normal text-fg-muted">{{ $t('AdminAppsView.colVersion') }}</th>
            <th class="px-4 pb-2 pt-3 text-left text-xs font-normal text-fg-muted">{{ $t('AdminAppsView.colStatus') }}</th>
            <th class="px-4 pb-2 pt-3 text-left text-xs font-normal text-fg-muted">{{ $t('AdminAppsView.colDate') }}</th>
            <th class="px-2 pb-2 pt-3 text-right text-xs font-normal text-fg-muted">{{ $t('AdminAppsView.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="approval in (approvals ?? [])"
            :key="approval.approvalId"
            class="border-t border-faint"
          >
            <td class="px-2 py-3">
              <span class="font-mono text-heading">{{ approval.version_tag }}</span>
            </td>
            <td class="py-3 px-4">
              <div class="space-y-1.5">
                <AppVersionStatusBadge :status="approval.status" />
                <div v-if="approval.notes" class="flex items-start gap-1.5 max-w-xs">
                  <span class="text-xs font-medium text-fg-muted shrink-0 mt-px">{{ $t('AdminAppsView.notesLabel') }}</span>
                  <span class="text-xs text-fg-muted italic truncate" :title="approval.notes">{{ approval.notes }}</span>
                </div>
                <div v-if="approval.rejection_reason" class="flex items-start gap-1.5 max-w-xs">
                  <span class="text-xs font-medium text-danger shrink-0 mt-px">{{ $t('AdminAppsView.rejectionLabel') }}</span>
                  <span class="text-xs text-danger italic truncate" :title="approval.rejection_reason">{{ approval.rejection_reason }}</span>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 tabular-nums text-fg-muted">
              {{ formatDate(approval.created_at) }}
            </td>
            <td class="py-3 px-2">
              <div class="flex justify-end gap-2">
                <!-- Approving is the main action of the page; rejecting and
                     revoking are grey until hovered and ask for a reason. -->
                <BaseButton
                  v-if="approval.status === 'pending' || approval.status === 'rejected'"
                  size="sm"
                  :disabled="busy(approval.version_tag)"
                  @click="$emit('approve', approval.version_tag)"
                >
                  <Check :size="13" aria-hidden="true" />
                  {{ $t('AdminAppsView.approveBtn') }}
                </BaseButton>
                <BaseButton
                  v-if="approval.status === 'pending'"
                  variant="danger"
                  size="sm"
                  :disabled="busy(approval.version_tag)"
                  @click="$emit('reject', approval.version_tag)"
                >
                  <X :size="13" aria-hidden="true" />
                  {{ $t('AdminAppsView.rejectBtn') }}
                </BaseButton>
                <BaseButton
                  v-if="approval.status === 'approved'"
                  variant="danger"
                  size="sm"
                  :disabled="busy(approval.version_tag)"
                  @click="$emit('revoke', approval.version_tag)"
                >
                  <RotateCcw :size="13" aria-hidden="true" />
                  {{ $t('AdminAppsView.revokeBtn') }}
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

    </div>
  </div>
</template>
