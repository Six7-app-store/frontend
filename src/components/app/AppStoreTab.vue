<script setup lang="ts">
/**
 * The owner's view of an app in the store: status banner, visibility
 * switch and, for public apps, the approval state of every version with
 * submit, resubmit and withdraw.
 */
import { AlertCircle, Clock, Globe, Lock, Send, Undo2 } from 'lucide-vue-next'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import AppVersionStatusBadge from '@/components/app/AppVersionStatusBadge.vue'
import { formatDate } from '@/utils/format'
import type { AppVersionApproval } from '@/types'

defineProps<{
  app: any
  bannerStatus: 'none' | 'no_submission' | 'pending' | 'approved'
  versionOptions: string[]
  approvalByVersion: Record<string, AppVersionApproval>
  isOwner: boolean
  /** Version tag being withdrawn right now. */
  withdrawingVersion: string | null
  togglingPrivacy: boolean
}>()

defineEmits<{
  togglePrivacy: []
  submit: [versionTag: string]
  withdraw: [versionTag: string]
}>()
</script>

<template>
  <div class="space-y-6">

    <!-- Status banners -->
    <div v-if="bannerStatus === 'no_submission'" class="flex items-start gap-3 bg-warning-dot/10 border border-warning-dot/30 rounded-xl p-4 text-warning">
      <AlertCircle :size="20" class="flex-shrink-0 mt-0.5" />
      <p class="text-sm">{{ $t('AppsDetailView.bannerNoSubmission') }}</p>
    </div>
    <div v-else-if="bannerStatus === 'pending'" class="flex items-start gap-3 bg-warning-dot/10 border border-warning-dot/30 rounded-xl p-4 text-warning">
      <Clock :size="20" class="flex-shrink-0 mt-0.5" />
      <p class="text-sm">{{ $t('AppsDetailView.bannerPending') }}</p>
    </div>

    <!-- Visibility toggle card -->
    <div class="bg-line/[.04] rounded-xl border border-subtle p-5">
      <h3 class="text-sm font-semibold text-fg uppercase tracking-wide mb-4">{{ $t('AppsDetailView.storeVisibilityTitle') }}</h3>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg" :class="app.is_private ? 'bg-line/[.07] text-fg-muted' : 'bg-success-dot/10 text-success'">
            <Lock v-if="app.is_private" :size="20" />
            <Globe v-else :size="20" />
          </div>
          <div>
            <p class="font-medium text-fg">
              {{ app.is_private ? $t('AppsDetailView.visibilityPrivate') : $t('AppsDetailView.visibilityPublic') }}
            </p>
            <p class="text-sm text-fg-muted">
              {{ app.is_private ? $t('AppsDetailView.visibilityPrivateDesc') : $t('AppsDetailView.visibilityPublicDesc') }}
            </p>
          </div>
        </div>
        <!-- On = public. The switch only asks; togglePrivacy saves and
             flips ``is_private`` once the backend has accepted it. -->
        <ToggleSwitch
          :model-value="!app.is_private"
          :label="$t('AppsDetailView.storeVisibilityTitle')"
          :disabled="togglingPrivacy"
          @update:model-value="$emit('togglePrivacy')"
        />
      </div>
    </div>

    <!-- Version approval table (only for public apps) -->
    <div v-if="!app.is_private" class="bg-line/[.04] rounded-xl border border-subtle p-5">
      <h3 class="text-sm font-semibold text-fg uppercase tracking-wide mb-4">{{ $t('AppsDetailView.versionTableTitle') }}</h3>

      <div v-if="versionOptions.length === 0" class="text-sm text-fg-muted italic">
        {{ $t('AppsDetailView.noVersionsYet') }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-subtle text-left text-xs text-fg-muted uppercase tracking-wide">
              <th class="pb-2 pr-4">{{ $t('AppsDetailView.versionTableVersion') }}</th>
              <th class="pb-2 pr-4">{{ $t('AppsDetailView.versionTableStatus') }}</th>
              <th class="pb-2 pr-4">{{ $t('AppsDetailView.versionTableDate') }}</th>
              <th class="pb-2">{{ $t('AppsDetailView.versionTableAction') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="ver in versionOptions" :key="ver" class="hover:bg-line/[.07] transition-colors">
              <td class="py-2.5 pr-4 font-mono text-fg">{{ ver }}</td>
              <td class="py-2.5 pr-4">
                <AppVersionStatusBadge v-if="approvalByVersion[ver]" :status="approvalByVersion[ver].status" />
                <span v-else class="text-fg-muted text-xs">–</span>
              </td>
              <td class="py-2.5 pr-4 text-fg-muted text-xs">
                {{ approvalByVersion[ver] ? formatDate(approvalByVersion[ver].created_at) : '–' }}
              </td>
              <td class="py-2.5">
                <div v-if="approvalByVersion[ver]?.status === 'rejected'" class="space-y-1">
                  <p class="text-xs text-danger italic">
                    {{ $t('AppsDetailView.rejectionReasonLabel') }} {{ approvalByVersion[ver].rejection_reason || '–' }}
                  </p>
                  <button
                    v-if="isOwner"
                    @click="$emit('submit', ver)"
                    class="text-xs text-accent-fg hover:underline flex items-center gap-1"
                  >
                    <Send :size="12" />
                    {{ $t('AppsDetailView.resubmitButton') }}
                  </button>
                </div>
                <!-- Pending: withdraw button -->
                <div v-else-if="approvalByVersion[ver]?.status === 'pending' && isOwner">
                  <button
                    @click="$emit('withdraw', ver)"
                    :disabled="withdrawingVersion === ver"
                    class="text-xs text-fg-muted hover:text-danger hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Undo2 :size="12" />
                    {{ withdrawingVersion === ver ? '...' : $t('AppsDetailView.withdrawButton') }}
                  </button>
                </div>
                <button
                  v-else-if="!approvalByVersion[ver] && isOwner"
                  @click="$emit('submit', ver)"
                  class="text-xs text-success hover:underline flex items-center gap-1"
                >
                  <Send :size="12" />
                  {{ $t('AppsDetailView.submitButton') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Private app hint -->
    <div v-else class="bg-line/[.04] border border-subtle rounded-xl p-5 text-sm text-fg">
      {{ $t('AppsDetailView.privateAppStoreHint') }}
    </div>

  </div>
</template>
