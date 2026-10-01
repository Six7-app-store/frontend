<script setup lang="ts">
/**
 * The three overview cards of the deployment detail page: deployment
 * (name, release tag, creation date), app and owner.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import Card from '@/components/ui/Card.vue'
import InfoList, { type InfoItem } from '@/components/ui/InfoList.vue'
import { roleLabelKey } from '@/i18n/role-labels'
import { formatDateTime } from '@/utils/format'
import type { DeploymentWithRelations } from '@/types'

const props = defineProps<{
  deployment: DeploymentWithRelations
}>()

const { t } = useI18n()

const deploymentFacts = computed<InfoItem[]>(() => [
  { label: t('DeploymentsView.deploymentName'), value: props.deployment.name },
  { label: t('DeploymentDetailView.releaseTag'), value: props.deployment.releaseTag, mono: true },
  {
    label: t('DeploymentDetailView.deploymentCreated'),
    value: props.deployment.created_at ? formatDateTime(props.deployment.created_at) : '-',
  },
])

const appFacts = computed<InfoItem[]>(() => {
  const app = props.deployment.app
  if (!app) return []
  return [
    { label: t('DeploymentDetailView.appName'), value: app.name },
    {
      label: t('DeploymentDetailView.gitRepository'),
      value: app.git_link?.replace(/^https?:\/\//, ''),
      href: app.git_link ?? undefined,
      mono: true,
    },
  ]
})

const ownerFacts = computed<InfoItem[]>(() => {
  const user = props.deployment.user
  if (!user) return []
  return [
    { label: t('DeploymentDetailView.deploymentUserName'), value: user.username },
    { label: t('DeploymentDetailView.email'), value: user.email },
    { label: t('DeploymentDetailView.deploymentUserRole'), value: t(roleLabelKey(user.role)) },
  ]
})
</script>

<template>
  <div class="grid grid-cols-1 gap-card lg:grid-cols-3">
    <Card :title="$t('DeploymentDetailView.deploymentInfo')">
      <InfoList :items="deploymentFacts" />
    </Card>

    <Card :title="$t('DeploymentsView.deploymentApp')">
      <div v-if="deployment.app" class="flex flex-col gap-3">
        <InfoList :items="appFacts" />
        <MarkdownRenderer
          v-if="deployment.app.description && deployment.app.description.trim()"
          :source="deployment.app.description"
          variant="compact"
          :clamp="3"
          :expandable="true"
          class="text-sm"
        />
        <p v-else class="text-sm italic text-fg-muted">{{ $t('DeploymentDetailView.noDescription') }}</p>
      </div>
      <p v-else class="text-sm text-fg-muted">{{ $t('DeploymentDetailView.noAppInfo') }}</p>
    </Card>

    <Card :title="$t('DeploymentDetailView.deploymentOwner')">
      <InfoList v-if="deployment.user" :items="ownerFacts" />
      <p v-else class="text-sm text-fg-muted">{{ $t('DeploymentDetailView.noUserInfo') }}</p>
    </Card>
  </div>
</template>
