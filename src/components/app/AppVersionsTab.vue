<script setup lang="ts">
/**
 * The versions of an app. Those allowed to edit it also see, for a public
 * app, where every version stands in the review and can submit, resubmit
 * or withdraw it (the page confirms and saves). Type and commit of the
 * versions follow below, as far as the repository provides them.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AlertBox from '@/components/ui/AlertBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import InfoList, { type InfoItem } from '@/components/ui/InfoList.vue'
import AppVersionStatusBadge from '@/components/app/AppVersionStatusBadge.vue'
import {
  findVersion,
  versionInfo,
  versionOptions,
  type AppVersionEntry,
} from '@/services/app-presentation.service'
import { formatDate } from '@/utils/format'
import type { AppVersionApproval } from '@/types'

const props = defineProps<{
  versions: AppVersionEntry[]
  approvalByVersion: Record<string, AppVersionApproval>
  bannerStatus: 'none' | 'no_submission' | 'pending' | 'approved'
  canEdit: boolean
  isPrivate: boolean
  /** Version tag being withdrawn right now. */
  withdrawingVersion: string | null
}>()

defineEmits<{
  submit: [versionTag: string]
  withdraw: [versionTag: string]
}>()

const { t } = useI18n()

/** Review state and actions: only for those who may edit, and only for public apps. */
const showsReview = computed(() => props.canEdit && !props.isPrivate)

interface VersionRow {
  version: string
  approval: AppVersionApproval | undefined
}

const tags = computed(() => versionOptions(props.versions))

const rows = computed<VersionRow[]>(() =>
  tags.value.map((version) => ({ version, approval: props.approvalByVersion[version] })),
)

const columns = computed<DataTableColumn[]>(() => {
  const version: DataTableColumn = { id: 'version', label: t('AppsDetailView.versionTableVersion'), class: 'w-[140px]' }
  if (!showsReview.value) return [version]
  return [
    version,
    { id: 'status', label: t('AppsDetailView.versionTableStatus'), class: 'w-[200px]' },
    { id: 'date', label: t('AppsDetailView.versionTableDate') },
    { id: 'action', label: t('AppsDetailView.versionTableAction'), class: 'w-[240px]', align: 'right', hideLabel: true },
  ]
})

const details = computed<InfoItem[]>(() =>
  tags.value.flatMap((tag) => {
    const info = versionInfo(findVersion(props.versions, tag))
    return [
      { label: `${tag} ${t('AppsDetailView.versionType')}`, value: info.type },
      { label: `${tag} ${t('AppsDetailView.versionCommit')}`, value: info.commit.slice(0, 8), mono: true },
    ]
  }),
)
</script>

<template>
  <div class="flex max-w-content flex-col gap-section">
    <template v-if="showsReview">
      <AlertBox v-if="bannerStatus === 'no_submission'" tone="warning">
        {{ $t('AppsDetailView.bannerNoSubmission') }}
      </AlertBox>
      <AlertBox v-else-if="bannerStatus === 'pending'" tone="info">
        {{ $t('AppsDetailView.bannerPending') }}
      </AlertBox>
    </template>
    <AlertBox v-else-if="canEdit && isPrivate" tone="info">
      {{ $t('AppsDetailView.privateAppStoreHint') }}
    </AlertBox>

    <section class="surface-panel overflow-hidden">
      <h2 class="px-panel pb-3 pt-4 text-md font-semibold text-heading">{{ $t('AppsDetailView.versions.title') }}</h2>
      <DataTable
        :columns="columns"
        :rows="rows"
        :row-key="(row: VersionRow) => row.version"
        :caption="$t('AppsDetailView.versions.title')"
        class="px-panel"
      >
        <template #cell-version="{ row }">
          <span class="font-mono text-heading">{{ row.version }}</span>
        </template>
        <template #cell-status="{ row }">
          <AppVersionStatusBadge v-if="row.approval" :status="row.approval.status" size="sm" />
          <span v-else class="text-fg-muted">{{ $t('AppsDetailView.notSubmitted') }}</span>
        </template>
        <template #cell-date="{ row }">
          <span v-if="row.approval" class="tabular-nums text-fg-muted">{{ formatDate(row.approval.created_at) }}</span>
        </template>
        <template #cell-action="{ row }">
          <div v-if="row.approval?.status === 'rejected'" class="flex flex-col items-end gap-1 py-2">
            <p v-if="row.approval.rejection_reason" class="text-sm text-danger">
              {{ $t('AppsDetailView.rejectionReasonLabel') }} {{ row.approval.rejection_reason }}
            </p>
            <BaseButton variant="secondary" size="sm" @click="$emit('submit', row.version)">
              {{ $t('AppsDetailView.resubmitButton') }}
            </BaseButton>
          </div>
          <BaseButton
            v-else-if="row.approval?.status === 'pending'"
            variant="secondary"
            size="sm"
            :disabled="withdrawingVersion === row.version"
            @click="$emit('withdraw', row.version)"
          >
            {{ $t('AppsDetailView.withdrawButton') }}
          </BaseButton>
          <BaseButton
            v-else-if="!row.approval"
            variant="secondary"
            size="sm"
            @click="$emit('submit', row.version)"
          >
            {{ $t('AppsDetailView.submitButton') }}
          </BaseButton>
        </template>
      </DataTable>
    </section>

    <InfoList :items="details" data-testid="version-details" />
  </div>
</template>
