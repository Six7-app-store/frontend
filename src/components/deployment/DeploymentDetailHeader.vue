<script setup lang="ts">
/**
 * Header of the deployment detail page: deployment name, status and the
 * lifecycle actions (Pause/Resume, Delete). Deleting is grey until hovered
 * and asks first (the page shows the dialog).
 *
 * The buttons only request an action; availability is computed by the
 * caller (``useDeploymentLifecycle``) and passed in.
 */
import { PauseCircle, PlayCircle, Trash2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import DeploymentStatusBadge from '@/components/deployment/DeploymentStatusBadge.vue'
import type { PauseResumeAction } from '@/services/deployment-lifecycle.service'
import type { DeploymentWithRelations } from '@/types'

defineProps<{
  deployment: DeploymentWithRelations
  /** Owner or admin — only they get the lifecycle buttons. */
  canOperate: boolean
  canDelete: boolean
  deleteDisabledReason: string
  canPauseOrResume: boolean
  pauseResumeAction: PauseResumeAction | null
  pauseResumeBusy: boolean
}>()

defineEmits<{
  (e: 'delete'): void
  (e: 'pause-resume'): void
}>()
</script>

<template>
  <PageHeader :title="deployment.name" size="detail">
    <template #meta>
      <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
        <DeploymentStatusBadge :status="deployment.status" />
        <span class="text-disabled" aria-hidden="true">·</span>
        <span class="font-mono">{{ deployment.releaseTag }}</span>
      </div>
    </template>

    <template v-if="canPauseOrResume || canOperate" #actions>
      <!-- Pause / Resume: one slot, two states, visible only when the
           lifecycle matrix permits the action right now. -->
      <BaseButton
        v-if="canPauseOrResume"
        variant="secondary"
        :disabled="pauseResumeBusy"
        :title="pauseResumeAction === 'pause'
          ? $t('DeploymentDetailView.pauseTooltip')
          : $t('DeploymentDetailView.resumeTooltip')"
        @click="!pauseResumeBusy && $emit('pause-resume')"
      >
        <PauseCircle v-if="pauseResumeAction === 'pause'" :size="16" aria-hidden="true" />
        <PlayCircle v-else :size="16" aria-hidden="true" />
        {{ pauseResumeAction === 'pause'
          ? $t('DeploymentDetailView.deploymentPause')
          : $t('DeploymentDetailView.deploymentResume') }}
      </BaseButton>

      <!-- Single Delete button. The backend decides whether this triggers
           a destroy task or a straight soft-delete based on status. -->
      <BaseButton
        v-if="canOperate"
        variant="danger"
        :disabled="!canDelete"
        :disabled-reason="deleteDisabledReason || undefined"
        @click="canDelete && $emit('delete')"
      >
        <Trash2 :size="16" aria-hidden="true" />
        {{ $t('DeploymentDetailView.deploymentDelete') }}
      </BaseButton>
    </template>
  </PageHeader>
</template>
