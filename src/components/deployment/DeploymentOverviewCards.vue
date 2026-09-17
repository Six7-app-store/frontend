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
    <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Package :size="20" class="text-primary" />
        Deployment Info
      </h2>
      <div class="space-y-4">
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {{ $t('DeploymentsView.deploymentName') }}
          </div>
          <div class="text-sm font-medium text-gray-900">{{ deployment.name }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Release Tag</div>
          <div class="text-sm">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
              <GitBranch :size="12" class="mr-1" />
              {{ deployment.releaseTag }}
            </span>
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {{ $t('DeploymentDetailView.deploymentCreated') }}
          </div>
          <div class="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Calendar :size="14" />
            {{ deploymentTimestamp }}
          </div>
        </div>
      </div>
    </div>

    <!-- App info card -->
    <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Package :size="20" class="text-emerald-600" />
        {{ $t('DeploymentsView.deploymentApp') }}
      </h2>
      <div class="space-y-4" v-if="deployment.app">
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">App Name</div>
          <div class="text-sm font-medium text-gray-900">{{ deployment.app.name }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">{{
            $t('DeploymentDetailView.deploymentDescription') }}</div>
          <MarkdownRenderer
            v-if="deployment.app.description && deployment.app.description.trim()"
            :source="deployment.app.description"
            variant="compact"
            :clamp="3"
            :expandable="true"
            class="text-sm"
          />
          <div v-else class="text-sm text-gray-500 italic">No description</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Git Repository</div>
          <a :href="deployment.app.git_link ?? undefined" target="_blank"
            class="text-sm text-blue-600 hover:text-blue-800 underline break-all">
            {{ deployment.app.git_link }}
          </a>
        </div>
      </div>
      <div v-else class="text-sm text-gray-500">No app information available</div>
    </div>

    <!-- User info card -->
    <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <User :size="20" class="text-blue-600" />
        {{ $t('DeploymentDetailView.deploymentOwner') }}
      </h2>
      <div class="space-y-4" v-if="deployment.user">
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">{{
            $t('DeploymentDetailView.deploymentUserName') }}</div>
          <div class="text-sm font-medium text-gray-900 flex items-center gap-2">
            <div
              class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
              {{ deployment.user.username.substring(0, 2).toUpperCase() }}
            </div>
            {{ deployment.user.username }}
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</div>
          <div class="text-sm text-gray-700">{{ deployment.user.email }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">{{
            $t('DeploymentDetailView.deploymentUserRole') }}</div>
          <div class="text-sm">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 capitalize">
              {{ deployment.user.role }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="text-sm text-gray-500">No user information available</div>
    </div>
  </div>
</template>
