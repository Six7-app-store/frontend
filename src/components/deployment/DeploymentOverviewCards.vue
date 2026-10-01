<script setup lang="ts">
/**
 * The three overview cards of the deployment detail page: deployment
 * info (name, release tag, creation date), app info and owner info.
 */
import { computed } from 'vue'
import { Calendar, GitBranch, Package, User } from 'lucide-vue-next'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import { formatDateTime } from '@/utils/format'
import type { DeploymentWithRelations } from '@/types'

const props = defineProps<{
  deployment: DeploymentWithRelations
}>()

const deploymentTimestamp = computed(() => {
  return props.deployment.created_at ? formatDateTime(props.deployment.created_at) : '-'
})
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- Deployment info card -->
    <div class="bg-panel rounded-xl border border-subtle p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
        <Package :size="20" class="text-icon" />
        Deployment Info
      </h2>
      <div class="space-y-4">
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">
            {{ $t('DeploymentsView.deploymentName') }}
          </div>
          <div class="text-sm font-medium text-fg">{{ deployment.name }}</div>
        </div>
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.releaseTag') }}</div>
          <div class="text-sm">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-line/[.07] text-fg border border-strong">
              <GitBranch :size="12" class="mr-1" />
              {{ deployment.releaseTag }}
            </span>
          </div>
        </div>
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">
            {{ $t('DeploymentDetailView.deploymentCreated') }}
          </div>
          <div class="text-sm font-medium text-fg flex items-center gap-1">
            <Calendar :size="14" />
            {{ deploymentTimestamp }}
          </div>
        </div>
      </div>
    </div>

    <!-- App info card -->
    <div class="bg-panel rounded-xl border border-subtle p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
        <Package :size="20" class="text-icon" />
        {{ $t('DeploymentsView.deploymentApp') }}
      </h2>
      <div class="space-y-4" v-if="deployment.app">
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.appName') }}</div>
          <div class="text-sm font-medium text-fg">{{ deployment.app.name }}</div>
        </div>
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{
            $t('DeploymentDetailView.deploymentDescription') }}</div>
          <MarkdownRenderer
            v-if="deployment.app.description && deployment.app.description.trim()"
            :source="deployment.app.description"
            variant="compact"
            :clamp="3"
            :expandable="true"
            class="text-sm"
          />
          <div v-else class="text-sm text-fg-muted italic">{{ $t('DeploymentDetailView.noDescription') }}</div>
        </div>
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.gitRepository') }}</div>
          <a :href="deployment.app.git_link ?? undefined" target="_blank"
            class="text-sm text-accent-fg hover:text-accent-fg underline break-all">
            {{ deployment.app.git_link }}
          </a>
        </div>
      </div>
      <div v-else class="text-sm text-fg-muted">{{ $t('DeploymentDetailView.noAppInfo') }}</div>
    </div>

    <!-- User info card -->
    <div class="bg-panel rounded-xl border border-subtle p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
        <User :size="20" class="text-icon" />
        {{ $t('DeploymentDetailView.deploymentOwner') }}
      </h2>
      <div class="space-y-4" v-if="deployment.user">
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{
            $t('DeploymentDetailView.deploymentUserName') }}</div>
          <div class="text-sm font-medium text-fg flex items-center gap-2">
            <div
              class="avatar w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
              {{ deployment.user.username.substring(0, 2).toUpperCase() }}
            </div>
            {{ deployment.user.username }}
          </div>
        </div>
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{ $t('DeploymentDetailView.email') }}</div>
          <div class="text-sm text-fg">{{ deployment.user.email }}</div>
        </div>
        <div>
          <div class="text-xs text-fg-muted uppercase tracking-wide mb-1">{{
            $t('DeploymentDetailView.deploymentUserRole') }}</div>
          <div class="text-sm">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-line/[.07] text-fg border border-strong capitalize">
              {{ deployment.user.role }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="text-sm text-fg-muted">{{ $t('DeploymentDetailView.noUserInfo') }}</div>
    </div>
  </div>
</template>
