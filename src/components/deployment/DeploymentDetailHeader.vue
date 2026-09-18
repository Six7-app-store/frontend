<script setup lang="ts">
/**
 * Header of the deployment detail page: back link, deployment name,
 * status badge and the lifecycle action buttons (Pause/Resume, Delete).
 *
 * The buttons only request an action; availability is computed by the
 * caller (``useDeploymentLifecycle``) and passed in.
 */
import { CircleArrowLeft, PauseCircle, PlayCircle, Trash2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { getStatusStyles } from '@/utils/deployment-status-styles'
import { ROUTE_NAMES } from '@/router/route-names'
import type { PauseResumeAction } from '@/services/deployment-lifecycle.service'
import type { DeploymentWithRelations } from '@/types'

defineProps<{
  deployment: DeploymentWithRelations
  isOwnerView: boolean
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
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <RouterLink :to="{ name: ROUTE_NAMES.deploymentsList }">
        <button
          class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
          <CircleArrowLeft :size="24" class="text-gray-700" />
        </button>
      </RouterLink>

      <div>
        <h1 class="text-3xl font-bold text-gray-900">{{ deployment.name }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ $t('DeploymentDetailView.detailsSubtitle') }}</p>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex items-center gap-3">
        <component :is="getStatusStyles(deployment.status).icon" :size="20" :class="deployment.status === 'success' ? 'text-green-600' :
          deployment.status === 'failed' ? 'text-red-600' :
            deployment.status === 'running' ? 'text-blue-600' : 'text-yellow-600'" />
        <span
          class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border capitalize"
          :class="getStatusStyles(deployment.status).badgeClass">
          {{ $t(getStatusStyles(deployment.status).label) }}
        </span>
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
        :variant="pauseResumeAction === 'pause' ? 'yellow' : 'green'">
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
                     status. Hidden entirely for members. -->
      <BaseButton v-if="isOwnerView" @click="canDelete && $emit('delete')" :disabled="!canDelete"
        :title="deleteDisabledReason" class="flex items-center gap-2 px-4 py-2" variant="red">
        <Trash2 :size="18" />
        <span class="font-medium">{{ $t('DeploymentDetailView.deploymentDelete') }}</span>
      </BaseButton>
    </div>
  </div>
</template>
