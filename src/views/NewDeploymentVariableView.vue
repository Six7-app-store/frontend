<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useVariableForm } from '@/composables/useVariableForm'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import Spinner from '@/components/ui/Spinner.vue'
import VariableFieldCard from '@/components/deployment-wizard/VariableFieldCard.vue'
import { ArrowRight, ArrowLeft, Box, Layers } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()

const form = useVariableForm()
const {
  isLoading, variables, templateKeys, packerByTemplate, packerVariables, terraformVariables,
  missingRequired, canSubmit, load, save,
} = form

// Only one variable's info tooltip is open at a time.
const activeTooltip = ref<string | null>(null)
const toggleTooltip = (key: string) => {
  activeTooltip.value = activeTooltip.value === key ? null : key
}

onMounted(() => {
  if (!deploymentStore.draft.appId) {
    router.replace({ name: ROUTE_NAMES.apps })
    return
  }
  load()
})

const handleNext = () => {
  if (save()) router.push({ name: ROUTE_NAMES.deploymentSummary })
}

const handleBack = () => {
  router.push({ name: ROUTE_NAMES.deploymentTeams })
}
</script>

<template>
  <div class="bg-panel rounded-2xl p-10 border shadow-sm max-w-5xl mx-auto min-h-[600px] flex flex-col">

    <div class="mb-6">
      <DeploymentProgressBar :current-step="3" class="mb-8" />
      <div class="text-center">
        <h1 class="text-3xl font-bold text-fg">{{ t('deployment.summary.variablesConfigTitle') }}</h1>
        <p class="text-fg-muted font-medium mt-2 text-lg">
          {{ t('deployment.summary.appLabel') }}: {{ deploymentStore.draft.name || t('deployment.variables.unnamed') }}
        </p>
      </div>
    </div>

    <div class="flex-grow w-full max-w-7xl mx-auto mt-6">
      
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
        <Spinner class="mb-3" />
        <span class="text-fg-muted">{{ t('deployment.variables.loading') }}</span>
      </div>

      <div v-else-if="variables.length === 0" class="text-center py-12 text-fg-muted italic bg-line/[.04] rounded-xl border border-dashed">
        {{ t('deployment.variables.noVariables') }}
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div class="surface-sunken overflow-hidden">
          <div class="bg-line/[.07] border-b border-subtle text-fg px-6 py-4 flex items-center gap-3">
            <Box :size="24" />
            <div>
              <h2 class="text-xl font-bold">{{ t('deployment.summary.packerVars') }}</h2>
              <p class="text-xs text-fg-muted mt-0.5">{{ t('deployment.variables.packerDesc') }}</p>
            </div>
          </div>
          
          <div class="p-6 space-y-6 max-h-[600px] overflow-y-auto">
            <div v-if="packerVariables.length === 0" class="text-center py-8 text-fg-muted italic">
              {{ t('deployment.summary.noPackerVars') }}
            </div>

            <template v-for="tkey in templateKeys" :key="tkey">
              <div
                v-if="templateKeys.length > 1"
                class="-mx-6 px-6 py-2 bg-line/[.04] border-y border-subtle text-sm font-semibold text-fg"
              >
                Image: <code class="font-mono">{{ tkey }}</code>
              </div>

              <VariableFieldCard
                v-for="variable in packerByTemplate[tkey]"
                :key="`${tkey}.${variable.name}`"
                :variable="variable"
                :form="form"
                :tooltip-open="activeTooltip === form.formKey(variable)"
                @toggle-tooltip="toggleTooltip(form.formKey(variable))"
              />
            </template>
          </div>
        </div>

        <div class="surface-sunken overflow-hidden">
          <div class="bg-line/[.07] border-b border-subtle text-fg px-6 py-4 flex items-center gap-3">
            <Layers :size="24" />
            <div>
              <h2 class="text-xl font-bold">{{ t('deployment.summary.terraformVars') }}</h2>
              <p class="text-xs text-fg-muted mt-0.5">{{ t('deployment.variables.terraformDesc') }}</p>
            </div>
          </div>
          
          <div class="p-6 space-y-6 max-h-[600px] overflow-y-auto">
            <div v-if="terraformVariables.length === 0" class="text-center py-8 text-fg-muted italic">
              {{ t('deployment.summary.noTerraformVars') }}
            </div>
            
            <VariableFieldCard
              v-for="variable in terraformVariables"
              :key="variable.name"
              :variable="variable"
              :form="form"
              :tooltip-open="activeTooltip === form.formKey(variable)"
              @toggle-tooltip="toggleTooltip(form.formKey(variable))"
            />
          </div>
        </div>

      </div>
    </div>

    <div class="flex justify-between items-center mt-12 pt-6 border-t border-subtle">
      <button
        @click="handleBack"
        class="btn-secondary flex items-center gap-2 px-6 py-2.5 rounded-control font-semibold transition"
      >
        <ArrowLeft :size="18" />
        {{ t('deployment.actions.back') }}
      </button>

      <div v-if="!canSubmit && !isLoading && variables.length > 0" class="flex-1 mx-6 text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded px-3 py-2">
        <p class="font-semibold mb-0.5">{{ t('deployment.variables.missingRequiredTitle') }}</p>
        <ul class="list-disc pl-5">
          <li v-for="m in missingRequired" :key="m">{{ m }}</li>
        </ul>
      </div>

      <button
        @click="handleNext"
        :disabled="!canSubmit"
        :class="[
          'flex items-center gap-2 px-8 py-2.5 rounded-control font-semibold transition',
          canSubmit
            ? 'btn-primary'
            : 'bg-line/[.12] text-fg-muted cursor-not-allowed',
        ]"
      >
        {{ t('deployment.actions.next') }}
        <ArrowRight :size="18" />
      </button>
    </div>

  </div>
</template>