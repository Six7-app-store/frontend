<script setup lang="ts">
/**
 * Header of the deployment detail page: back link, deployment name,
 * status badge and the lifecycle action buttons (Pause/Resume, Delete).
 *
 * The buttons only request an action; availability is computed by the
 * caller (``useDeploymentLifecycle``) and passed in.
 */
import { PauseCircle, PlayCircle, Trash2 } from 'lucide-vue-next'
import BackLink from '@/components/ui/BackLink.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { getStatusStyles } from '@/utils/deployment-status-styles'
import { ROUTE_NAMES } from '@/router/route-names'
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
  <div>
    <BackLink :to="{ name: ROUTE_NAMES.deploymentsList }" :label="$t('DeploymentDetailView.backToList')" class="mb-4" />
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-fg">{{ deployment.name }}</h1>
        <p class="text-sm text-fg-muted mt-1">{{ $t('DeploymentDetailView.detailsSubtitle') }}</p>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <component :is="getStatusStyles(deployment.status).icon" :size="20" :class="getStatusStyles(deployment.status).iconClass" />
          <StatusBadge :status="deployment.status" size="md" />
        </div>

        <!-- Pause / Resume button. One slot, two states, visible only
                       when the lifecycle matrix permits the action right now. -->
        <BaseButton
          v-if="canPauseOrResume"
          @click="!pauseResumeBusy && $emit('pause-resume')"
          :disabled="pauseResumeBusy"
          :title="pauseResumeAction === 'pause'
            ? $t('DeploymentDetailView.pauseTooltip')
            : $t('DeploymentDetailView.resumeTooltip')"
          class="flex items-center gap-2 px-4 py-2"
          :variant="pauseResumeAction === 'pause' ? 'primary' : 'secondary'">
          <PauseCircle v-if="pauseResumeAction === 'pause'" :size="18" />
          <PlayCircle v-else :size="18" />
          <span class="font-medium">
            {{ pauseResumeAction === 'pause'
              ? $t('DeploymentDetailView.deploymentPause')
              : $t('DeploymentDetailView.deploymentResume') }}
          </span>
        </BaseButton>

        <!-- Single Delete button. The backend decides whether this
                       triggers a destroy task or a straight soft-delete based on
                       status. Hidden for everyone who may not operate it. -->
        <BaseButton v-if="canOperate" @click="canDelete && $emit('delete')" :disabled="!canDelete"
          :title="deleteDisabledReason" class="flex items-center gap-2 px-4 py-2" variant="danger">
          <Trash2 :size="18" />
          <span class="font-medium">{{ $t('DeploymentDetailView.deploymentDelete') }}</span>
        </BaseButton>
      </div>
    </div>
  </div>
</template>
