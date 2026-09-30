<script setup lang="ts">
/**
 * Configuration variables the deployment was created with, shown with
 * trailing comments and quotes stripped (``cleanVariableValue``).
 */
import { cleanVariableValue } from '@/services/deployment-input.service'
import Card from '@/components/ui/Card.vue'

defineProps<{
  variables: Record<string, any>
}>()
</script>

<template>
  <Card v-if="Object.keys(variables).length > 0" :title="$t('DeploymentDetailView.deploymentConfig')">

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="(value, key) in variables" :key="key"
        data-testid="variable-card"
        class="rounded-panel border border-subtle p-4">
        <div class="text-xs text-fg-muted mb-1 font-mono">{{ key }}</div>
        <div class="font-medium text-fg break-all text-sm">
          {{ cleanVariableValue(value) }}
        </div>
      </div>
    </div>
  </Card>
</template>
