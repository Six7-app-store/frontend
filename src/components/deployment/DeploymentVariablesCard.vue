<script setup lang="ts">
/**
 * Configuration variables the deployment was created with, shown with
 * trailing comments and quotes stripped (``cleanVariableValue``).
 */
import { Settings } from 'lucide-vue-next'
import { cleanVariableValue } from '@/services/deployment-input.service'
import DetailSection from '@/components/ui/DetailSection.vue'

defineProps<{
  variables: Record<string, any>
}>()
</script>

<template>
  <DetailSection v-if="Object.keys(variables).length > 0" :icon="Settings" :title="$t('DeploymentDetailView.deploymentConfig')">

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="(value, key) in variables" :key="key"
        class="bg-line/[.04] rounded-lg p-4 border border-subtle">
        <div class="text-xs text-fg-muted uppercase tracking-wide mb-1 font-mono">{{ key }}</div>
        <div class="font-medium text-fg break-all text-sm">
          {{ cleanVariableValue(value) }}
        </div>
      </div>
    </div>
  </DetailSection>
</template>
