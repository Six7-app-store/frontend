<script setup lang="ts">
/**
 * Configuration variables the deployment was created with, shown with
 * trailing comments and quotes stripped (``cleanVariableValue``).
 */
import { Settings } from 'lucide-vue-next'
import { cleanVariableValue } from '@/services/deployment-input.service'

defineProps<{
  variables: Record<string, any>
}>()
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
    v-if="Object.keys(variables).length > 0">
    <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Settings :size="20" class="text-orange-600" />
      {{ $t('DeploymentDetailView.deploymentConfig') }}
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="(value, key) in variables" :key="key"
        class="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1 font-mono">{{ key }}</div>
        <div class="font-medium text-gray-800 break-all text-sm">
          {{ cleanVariableValue(value) }}
        </div>
      </div>
    </div>
  </div>
</template>
