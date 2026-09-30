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
  <div class="border border-subtle rounded-xl overflow-hidden">
    <!-- App row (header) -->
    <button
      class="w-full flex items-center gap-4 px-5 py-4 bg-panel hover:bg-line/[.04] transition-colors text-left"
      @click="$emit('toggle')"
    >
      <component
        :is="expanded ? ChevronDown : ChevronRight"
        :size="18"
        class="text-fg-muted flex-shrink-0"
      />

      <!-- App name -->
      <span class="font-semibold text-fg flex-grow">{{ app.name }}</span>

      <!-- Link to app detail -->
      <RouterLink
        :to="{ name: ROUTE_NAMES.appsDetail, params: { id: app.appId } }"
        class="text-fg-muted hover:text-accent-fg transition-colors p-1 rounded"
        :title="$t('AdminAppsView.goToApp')"
        @click.stop
      >
        <ExternalLink :size="15" />
      </RouterLink>

      <!-- Pending badge -->
      <span
        v-if="pendingCount && !app.is_private"
        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-dot/10 text-warning"
      >
        {{ pendingCount }} {{ $t('AdminAppsView.pendingLabel') }}
      </span>
      <span
        v-else-if="app.is_private"
        class="text-xs text-fg-muted"
      >
        {{ $t('AdminAppsView.privateLabel') }}
      </span>
      <span
        v-else
        class="text-xs text-fg-muted"
      >
        {{ $t('AdminAppsView.noPendingLabel') }}
      </span>
    </button>

    <!-- Expanded: versions -->
    <div v-if="expanded" class="border-t border-subtle bg-line/[.04]">

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
      <div v-else class="px-4 pb-3">
      <table class="w-full text-sm">
        <thead class="border-b border-subtle">
          <tr>
            <th class="text-left py-2 px-2 text-xs font-semibold text-fg-muted uppercase tracking-wide">{{ $t('AdminAppsView.colVersion') }}</th>
            <th class="text-left py-2 px-4 text-xs font-semibold text-fg-muted uppercase tracking-wide">{{ $t('AdminAppsView.colStatus') }}</th>
            <th class="text-left py-2 px-4 text-xs font-semibold text-fg-muted uppercase tracking-wide">{{ $t('AdminAppsView.colDate') }}</th>
            <th class="text-right py-2 px-2 text-xs font-semibold text-fg-muted uppercase tracking-wide">{{ $t('AdminAppsView.colActions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr
            v-for="approval in (approvals ?? [])"
            :key="approval.approvalId"
            class="bg-panel hover:bg-line/[.04] transition-colors"
          >
            <td class="py-3 px-2">
              <span class="font-mono text-fg bg-line/[.07] px-2 py-0.5 rounded text-xs">
                {{ approval.version_tag }}
              </span>
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
            <td class="py-3 px-4 text-fg-muted text-xs">
              {{ formatDate(approval.created_at) }}
            </td>
            <td class="py-3 px-2">
              <div class="flex justify-end gap-2">
                <!-- Pending or rejected: approve -->
                <button
                  v-if="approval.status === 'pending' || approval.status === 'rejected'"
                  @click="$emit('approve', approval.version_tag)"
                  :disabled="busy(approval.version_tag)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-dot/10 text-success border border-success-dot/30 text-xs font-medium hover:bg-success-dot/10 transition-colors disabled:opacity-50"
                >
                  <Check :size="13" />
                  {{ $t('AdminAppsView.approveBtn') }}
                </button>
                <!-- Pending: reject -->
                <button
                  v-if="approval.status === 'pending'"
                  @click="$emit('reject', approval.version_tag)"
                  :disabled="busy(approval.version_tag)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-dot/10 text-danger border border-danger-dot/30 text-xs font-medium hover:bg-danger-dot/10 transition-colors disabled:opacity-50"
                >
                  <X :size="13" />
                  {{ $t('AdminAppsView.rejectBtn') }}
                </button>
                <!-- Approved: revoke -->
                <button
                  v-if="approval.status === 'approved'"
                  @click="$emit('revoke', approval.version_tag)"
                  :disabled="busy(approval.version_tag)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-line/[.07] text-fg-muted border border-subtle text-xs font-medium hover:bg-line/[.12] transition-colors disabled:opacity-50"
                >
                  <RotateCcw :size="13" />
                  {{ $t('AdminAppsView.revokeBtn') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

    </div>
  </div>
</template>
