<script setup lang="ts">
/** Version picker and the button that starts the deployment wizard. */
import { Layers } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-names'

defineProps<{
  versionOptions: string[]
  /** OpenStack credentials are known to be missing: deploying is blocked. */
  credentialsMissing: boolean
}>()

const selectedVersion = defineModel<string>('selectedVersion', { required: true })

defineEmits<{ deploy: [] }>()
</script>

<template>
  <div class="surface-sunken p-6 h-fit sticky top-6">
    <h2 class="text-lg font-semibold text-fg mb-6">{{ $t('AppsDetailView.startDeploymentTitle') }}</h2>

    <div class="mb-6">
      <label class="block text-sm font-medium text-fg mb-2">{{ $t('AppsDetailView.selectVersionLabel') }}</label>
      <select
        v-model="selectedVersion"
        class="field w-full py-2 px-3 text-sm text-fg focus:border-accent/60 cursor-pointer transition-all hover:border-strong"
        :disabled="versionOptions.length === 0"
      >
        <option v-for="ver in versionOptions" :key="ver" :value="ver">{{ ver }}</option>
      </select>
    </div>

    <button
      @click="$emit('deploy')"
      :disabled="!selectedVersion || credentialsMissing"
      :title="credentialsMissing ? $t('AppsDetailView.missingCredsTitle') : ''"
      class="btn-primary w-full px-4 py-3 rounded-control font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Layers :size="18" />
      {{ $t('AppsDetailView.deployButton') }}
    </button>
    <p v-if="credentialsMissing" class="mt-2 text-sm text-warning">
      <router-link :to="{ name: ROUTE_NAMES.userOpenStack }" class="underline font-medium">{{ $t('AppsDetailView.missingCredsLink') }}</router-link>
      {{ $t('AppsDetailView.missingCredsText') }}
    </p>
  </div>
</template>
