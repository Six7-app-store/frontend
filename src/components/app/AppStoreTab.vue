<script setup lang="ts">
/**
 * The owner's view of an app in the store: status notice, visibility
 * switch, for public apps the approval state of every version with
 * submit, resubmit and withdraw, and deleting the app at the bottom.
 * Withdrawing and deleting are only asked for here; the page confirms them.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AlertBox from '@/components/ui/AlertBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Card from '@/components/ui/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import AppVersionStatusBadge from '@/components/app/AppVersionStatusBadge.vue'
import { formatDate } from '@/utils/format'
import type { AppVersionApproval } from '@/types'

const props = defineProps<{
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
  delete: []
}>()

const { t } = useI18n()

interface VersionRow {
  version: string
  approval: AppVersionApproval | undefined
}

const rows = computed<VersionRow[]>(() =>
  props.versionOptions.map((version) => ({ version, approval: props.approvalByVersion[version] })),
)

const columns = computed<DataTableColumn[]>(() => [
  { id: 'version', label: t('AppsDetailView.versionTableVersion'), class: 'w-[120px]' },
  { id: 'status', label: t('AppsDetailView.versionTableStatus'), class: 'w-[200px]' },
  { id: 'date', label: t('AppsDetailView.versionTableDate') },
  { id: 'action', label: t('AppsDetailView.versionTableAction'), class: 'w-[240px]', align: 'right', hideLabel: true },
])
</script>

<template>
  <div class="flex flex-col gap-section">
    <AlertBox v-if="bannerStatus === 'no_submission'" tone="warning">
      {{ $t('AppsDetailView.bannerNoSubmission') }}
    </AlertBox>
    <AlertBox v-else-if="bannerStatus === 'pending'" tone="info">
      {{ $t('AppsDetailView.bannerPending') }}
    </AlertBox>

    <!-- Visibility: on = public. The switch only asks; togglePrivacy saves
         and flips ``is_private`` once the backend has accepted it. -->
    <section class="surface-panel flex items-center gap-6 p-panel">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h2 class="text-md font-semibold text-heading">{{ $t('AppsDetailView.storePublicTitle') }}</h2>
        <p class="text-base text-fg-muted">
          {{ app.is_private ? $t('AppsDetailView.visibilityPrivateDesc') : $t('AppsDetailView.visibilityPublicDesc') }}
        </p>
      </div>
      <ToggleSwitch
        :model-value="!app.is_private"
        :label="$t('AppsDetailView.storePublicTitle')"
        :disabled="togglingPrivacy"
        @update:model-value="$emit('togglePrivacy')"
      />
    </section>

    <Card v-if="!app.is_private" :title="$t('AppsDetailView.versionTableTitle')" flush>
      <p v-if="versionOptions.length === 0" class="p-panel text-base text-fg-muted">
        {{ $t('AppsDetailView.noVersionsYet') }}
      </p>

      <DataTable
        v-else
        :columns="columns"
        :rows="rows"
        :row-key="(row: VersionRow) => row.version"
        :caption="$t('AppsDetailView.versionTableTitle')"
      >
        <template #cell-version="{ row }">
          <span class="font-mono text-heading">{{ row.version }}</span>
        </template>
        <template #cell-status="{ row }">
          <AppVersionStatusBadge v-if="row.approval" :status="row.approval.status" size="sm" />
          <span v-else class="text-fg-muted">{{ $t('AppsDetailView.notSubmitted') }}</span>
        </template>
        <template #cell-date="{ row }">
          <span class="tabular-nums text-fg-muted">{{ row.approval ? formatDate(row.approval.created_at) : '—' }}</span>
        </template>
        <template #cell-action="{ row }">
          <div v-if="row.approval?.status === 'rejected'" class="flex flex-col items-end gap-1 py-2">
            <p class="text-sm text-danger">
              {{ $t('AppsDetailView.rejectionReasonLabel') }} {{ row.approval.rejection_reason || '–' }}
            </p>
            <BaseButton v-if="isOwner" variant="secondary" size="sm" @click="$emit('submit', row.version)">
              {{ $t('AppsDetailView.resubmitButton') }}
            </BaseButton>
          </div>
          <BaseButton
            v-else-if="row.approval?.status === 'pending' && isOwner"
            variant="danger"
            size="sm"
            :disabled="withdrawingVersion === row.version"
            @click="$emit('withdraw', row.version)"
          >
            {{ $t('AppsDetailView.withdrawButton') }}
          </BaseButton>
          <BaseButton
            v-else-if="!row.approval && isOwner"
            variant="secondary"
            size="sm"
            @click="$emit('submit', row.version)"
          >
            {{ $t('AppsDetailView.submitButton') }}
          </BaseButton>
        </template>
      </DataTable>
    </Card>

    <AlertBox v-else tone="info">
      {{ $t('AppsDetailView.privateAppStoreHint') }}
    </AlertBox>

    <!-- Deleting sits last and quiet: grey until hovered, confirmed in a dialog. -->
    <section class="flex items-center justify-between gap-6 rounded-panel border border-subtle px-panel py-4">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 class="text-base font-semibold text-heading">{{ $t('AppsDetailView.confirmDeleteTitle') }}</h2>
        <p class="text-sm text-fg-muted">{{ $t('AppsDetailView.deleteZoneText', { name: app.name }) }}</p>
      </div>
      <BaseButton variant="danger" @click="$emit('delete')">
        {{ $t('AppsDetailView.deleteZoneButton') }}
      </BaseButton>
    </section>
  </div>
</template>
