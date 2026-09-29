<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useVariableForm } from '@/composables/useVariableForm'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import Spinner from '@/components/ui/Spinner.vue'
import VariableInput from '@/components/VariableInput.vue'
import ScopeBadge from '@/components/ui/ScopeBadge.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import { effectiveVariableScope as effectiveScope } from '@/services/deployment-variables.service'
import { isList } from '@/services/variable-types'
import { isFileVariable as isFileVar, isScoped, userSlotKey } from '@/services/variable-form.service'
import {
  ArrowRight,
  ArrowLeft,
  Info,
  Box,
  Layers,
  AlertTriangle,
} from 'lucide-vue-next'
import type { AppVariable } from '@/types'

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()

const {
  teams,
  isLoading,
  variables,
  values,
  formKey,
  slotKeysFor,
  templateKeys,
  packerByTemplate,
  packerVariables,
  terraformVariables,
  missingRequired,
  canSubmit,
  load,
  save,
  getScopedValue,
  setScopedValue,
  getFileSlot,
  setFileSlot,
  networkForSubnet,
} = useVariableForm()

const activeTooltip = ref<string | null>(null)
const toggleTooltip = (name: string) => {
  activeTooltip.value = activeTooltip.value === name ? null : name
}

const focusInput = (id: string) => document.getElementById(id)?.focus()

/** ``accept`` attribute for a file variable. */
const fileAcceptFor = (v: AppVariable): string =>
  v.fileExtensions?.length ? v.fileExtensions.map((e) => `.${e}`).join(',') : '*'

/** Label of a slot input: the team, or team and person. */
const formatSlotLabel = (variable: AppVariable, slotKey: string): string => {
  const scope = effectiveScope(variable)
  if (scope === 'team') return `Team „${slotKey}"`
  if (scope === 'user') {
    // Longest team name first, so "Team-10" is not read as "Team-1" + "0-…".
    const names = teams.value.map((team) => team.name).sort((a, b) => b.length - a.length)
    for (const team of names) {
      if (slotKey === team) return `Team „${team}"`
      if (slotKey.startsWith(team + '-')) return `Team „${team}" → ${slotKey.slice(team.length + 1)}`
    }
    const sep = slotKey.lastIndexOf('-')
    if (sep > 0) return `Team „${slotKey.slice(0, sep)}" → ${slotKey.slice(sep + 1)}`
  }
  return slotKey
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

              <div v-for="variable in packerByTemplate[tkey]" :key="`${tkey}.${variable.name}`" class="bg-panel rounded-lg p-4 border border-subtle shadow-sm">
              <div class="flex items-start justify-between gap-2 mb-3">
                <label
                  :for="formKey(variable)"
                  @click.prevent="focusInput(formKey(variable))"
                  class="text-base font-bold text-fg cursor-pointer hover:text-fg transition-colors flex-1"
                >
                  {{ variable.name }}
                </label>

                <button
                  v-if="variable.description || isList(variable.type)"
                  @click.stop="toggleTooltip(formKey(variable))"
                  class="text-fg-muted hover:text-fg-muted transition-colors "
                  :class="activeTooltip === formKey(variable) ? 'text-fg-muted' : ''"
                  :title="t('deployment.variables.showInfo')"
                >
                  <Info :size="16" />
                </button>
              </div>

              <div
                v-if="variable.markerError"
                class="mb-3 bg-warning-dot/10 p-3 rounded-lg border border-warning-dot/30 text-xs text-warning"
              >
                <p class="font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle :size="14" class="shrink-0" />
                  {{ t('deployment.variables.markerErrorTitle') }}
                </p>
                <p>{{ variable.markerError.message }}</p>
                <p v-if="variable.markerError.location" class="mt-1 font-mono text-warning">
                  {{ variable.markerError.location }}
                </p>
              </div>

              <div v-if="activeTooltip === formKey(variable)" class="mb-3 bg-line/[.04] p-3 rounded-lg border border-subtle text-sm text-fg">
                <p v-if="variable.description" class="mb-2">{{ variable.description }}</p>
                <div v-if="isList(variable.type)" class="flex gap-2 items-start text-xs text-fg">
                  <Info :size="12" class="mt-0.5 shrink-0" />
                  <span>{{ t('deployment.variables.commaSeparated') }}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="text-[10px] font-bold uppercase tracking-wider bg-line/[.07] text-fg px-2 py-0.5 rounded border border-subtle">
                  {{ variable.type }}
                </span>
                <span v-if="variable.required" class="text-[10px] font-bold uppercase tracking-wider bg-danger-dot/10 text-danger px-2 py-0.5 rounded border border-danger-dot/30">
                  {{ t('deployment.variables.required') }}
                </span>
                <ScopeBadge :scope="effectiveScope(variable)" />
              </div>

              <div
                v-if="isScoped(variable)"
                class="mb-3 text-xs text-fg bg-line/[.04] border border-subtle rounded px-3 py-2"
              >
                <p class="font-semibold mb-0.5">
                  {{ effectiveScope(variable) === 'team' ? t('deployment.variables.scopeTitleTeam') : t('deployment.variables.scopeTitleUser') }}
                </p>
                <p v-html="effectiveScope(variable) === 'team' ? t('deployment.variables.scopeDescTeam') : t('deployment.variables.scopeDescUser')"></p>
              </div>

              <div v-if="isFileVar(variable)" class="space-y-3">
                <FileDropZone
                  v-if="(variable.osScope || 'all') === 'all'"
                  :model-value="getFileSlot(variable.name, 'all')"
                  @update:modelValue="(v) => setFileSlot(variable.name, 'all', v)"
                  :label="variable.name"
                  :accept="fileAcceptFor(variable)"
                />
                <template v-else-if="variable.osScope === 'team'">
                  <FileDropZone
                    v-for="team in teams"
                    :key="`${variable.name}::${team.name}`"
                    :model-value="getFileSlot(variable.name, team.name)"
                    @update:modelValue="(v) => setFileSlot(variable.name, team.name, v)"
                    :label="team.name"
                    :accept="fileAcceptFor(variable)"
                  />
                  <div v-if="teams.length === 0" class="text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2">
                    {{ t('deployment.variables.noTeamsConfigured') }}
                  </div>
                </template>
                <template v-else-if="variable.osScope === 'user'">
                  <div
                    v-for="team in teams"
                    :key="`${variable.name}::${team.name}`"
                    class="border-l-2 border-subtle pl-3 space-y-2"
                  >
                    <div class="text-xs font-semibold text-fg-muted uppercase tracking-wide">
                      {{ team.name }}
                    </div>
                    <FileDropZone
                      v-for="member in team.members"
                      :key="`${variable.name}::${team.name}::${member.userId}`"
                      :model-value="getFileSlot(variable.name, userSlotKey(team.name, member.username))"
                      @update:modelValue="(v) => setFileSlot(variable.name, userSlotKey(team.name, member.username), v)"
                      :label="member.username"
                      :accept="fileAcceptFor(variable)"
                    />
                    <div v-if="team.members.length === 0" class="text-xs text-fg-muted italic">
                      {{ t('deployment.variables.noMembers') }}
                    </div>
                  </div>
                  <div v-if="teams.length === 0" class="text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2">
                    {{ t('deployment.variables.noTeamsConfigured') }}
                  </div>
                </template>
              </div>

              <template v-else>
                <VariableInput
                  v-if="!isScoped(variable)"
                  :variable="variable"
                  :model-value="values[formKey(variable)]"
                  @update:modelValue="(v) => (values[formKey(variable)] = v)"
                  :filter-network-id="variable.osType === 'subnet' ? networkForSubnet : null"
                  :input-id="formKey(variable)"
                />
                <div v-else class="space-y-3">
                  <div
                    v-if="slotKeysFor(variable).length === 0 && effectiveScope(variable) === 'team'"
                    class="text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2"
                  >
                    {{ t('deployment.variables.noTeamsConfigured') }}
                  </div>
                  <template v-if="effectiveScope(variable) === 'user'">
                    <div v-if="teams.length === 0" class="text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2">
                      {{ t('deployment.variables.noTeamsConfigured') }}
                    </div>
                    <div
                      v-for="team in teams"
                      :key="`${variable.name}::team::${team.name}`"
                      class="border-l-2 border-subtle pl-3 space-y-2"
                    >
                      <div class="text-xs font-semibold text-fg-muted uppercase tracking-wide">
                        {{ team.name }}
                      </div>
                      <div
                        v-for="member in team.members"
                        :key="`${variable.name}::${team.name}::${member.userId}`"
                        class="flex flex-col gap-1"
                      >
                        <label
                          :for="`${formKey(variable)}__${userSlotKey(team.name, member.username)}`"
                          class="text-xs font-semibold text-fg-muted"
                        >
                          {{ member.username }}
                        </label>
                        <VariableInput
                          :variable="variable"
                          :model-value="getScopedValue(formKey(variable), userSlotKey(team.name, member.username))"
                          @update:modelValue="(v) => setScopedValue(formKey(variable), userSlotKey(team.name, member.username), v)"
                          :filter-network-id="variable.osType === 'subnet' ? networkForSubnet : null"
                          :input-id="`${formKey(variable)}__${userSlotKey(team.name, member.username)}`"
                        />
                      </div>
                      <div v-if="team.members.length === 0" class="text-xs text-fg-muted italic">
                        {{ t('deployment.variables.noMembers') }}
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div
                      v-for="slotKey in slotKeysFor(variable)"
                      :key="`${variable.name}::${slotKey}`"
                      class="flex flex-col gap-1"
                    >
                      <label
                        :for="`${formKey(variable)}__${slotKey}`"
                        class="text-xs font-semibold text-fg-muted"
                      >
                        {{ formatSlotLabel(variable, slotKey) }}
                      </label>
                      <VariableInput
                        :variable="variable"
                        :model-value="getScopedValue(formKey(variable), slotKey)"
                        @update:modelValue="(v) => setScopedValue(formKey(variable), slotKey, v)"
                        :filter-network-id="variable.osType === 'subnet' ? networkForSubnet : null"
                        :input-id="`${formKey(variable)}__${slotKey}`"
                      />
                    </div>
                  </template>
                </div>
              </template>
            </div>
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
            
            <div v-for="variable in terraformVariables" :key="variable.name" class="bg-panel rounded-lg p-4 border border-subtle shadow-sm">
              <div class="flex items-start justify-between gap-2 mb-3">
                <label
                  :for="variable.name"
                  @click.prevent="focusInput(variable.name)"
                  class="text-base font-bold text-fg cursor-pointer hover:text-fg transition-colors flex-1"
                >
                  {{ variable.name }}
                </label>

                <button
                  v-if="variable.description || isList(variable.type)"
                  @click.stop="toggleTooltip(variable.name)"
                  class="text-fg-muted hover:text-fg-muted transition-colors "
                  :class="activeTooltip === variable.name ? 'text-fg-muted' : ''"
                  :title="t('deployment.variables.showInfo')"
                >
                  <Info :size="16" />
                </button>
              </div>

              <div
                v-if="variable.markerError"
                class="mb-3 bg-warning-dot/10 p-3 rounded-lg border border-warning-dot/30 text-xs text-warning"
              >
                <p class="font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle :size="14" class="shrink-0" />
                  {{ t('deployment.variables.markerErrorTitle') }}
                </p>
                <p>{{ variable.markerError.message }}</p>
                <p v-if="variable.markerError.location" class="mt-1 font-mono text-warning">
                  {{ variable.markerError.location }}
                </p>
              </div>

              <div v-if="activeTooltip === variable.name" class="mb-3 bg-line/[.04] p-3 rounded-lg border border-subtle text-sm text-fg">
                <p v-if="variable.description" class="mb-2">{{ variable.description }}</p>
                <div v-if="isList(variable.type)" class="flex gap-2 items-start text-xs text-fg">
                  <Info :size="12" class="mt-0.5 shrink-0" />
                  <span>{{ t('deployment.variables.commaSeparated') }}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="text-[10px] font-bold uppercase tracking-wider bg-line/[.07] text-fg px-2 py-0.5 rounded border border-subtle">
                  {{ variable.type }}
                </span>
                <span v-if="variable.required" class="text-[10px] font-bold uppercase tracking-wider bg-danger-dot/10 text-danger px-2 py-0.5 rounded border border-danger-dot/30">
                  {{ t('deployment.variables.required') }}
                </span>
                <ScopeBadge :scope="effectiveScope(variable)" />
              </div>

              <div
                v-if="isScoped(variable)"
                class="mb-3 text-xs text-fg bg-line/[.04] border border-subtle rounded px-3 py-2"
              >
                <p class="font-semibold mb-0.5">
                  {{ effectiveScope(variable) === 'team' ? t('deployment.variables.scopeTitleTeam') : t('deployment.variables.scopeTitleUser') }}
                </p>
                <p v-html="effectiveScope(variable) === 'team' ? t('deployment.variables.scopeDescTeam') : t('deployment.variables.scopeDescUser')"></p>
              </div>

              <div v-if="isFileVar(variable)" class="space-y-3">
                <FileDropZone
                  v-if="(variable.osScope || 'all') === 'all'"
                  :model-value="getFileSlot(variable.name, 'all')"
                  @update:modelValue="(v) => setFileSlot(variable.name, 'all', v)"
                  :label="variable.name"
                  :accept="fileAcceptFor(variable)"
                />
                <template v-else-if="variable.osScope === 'team'">
                  <FileDropZone
                    v-for="team in teams"
                    :key="`${variable.name}::${team.name}`"
                    :model-value="getFileSlot(variable.name, team.name)"
                    @update:modelValue="(v) => setFileSlot(variable.name, team.name, v)"
                    :label="team.name"
                    :accept="fileAcceptFor(variable)"
                  />
                  <div v-if="teams.length === 0" class="text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2">
                    {{ t('deployment.variables.noTeamsConfigured') }}
                  </div>
                </template>
                <template v-else-if="variable.osScope === 'user'">
                  <div
                    v-for="team in teams"
                    :key="`${variable.name}::${team.name}`"
                    class="border-l-2 border-subtle pl-3 space-y-2"
                  >
                    <div class="text-xs font-semibold text-fg-muted uppercase tracking-wide">
                      {{ team.name }}
                    </div>
                    <FileDropZone
                      v-for="member in team.members"
                      :key="`${variable.name}::${team.name}::${member.userId}`"
                      :model-value="getFileSlot(variable.name, userSlotKey(team.name, member.username))"
                      @update:modelValue="(v) => setFileSlot(variable.name, userSlotKey(team.name, member.username), v)"
                      :label="member.username"
                      :accept="fileAcceptFor(variable)"
                    />
                    <div v-if="team.members.length === 0" class="text-xs text-fg-muted italic">
                      {{ t('deployment.variables.noMembers') }}
                    </div>
                  </div>
                  <div v-if="teams.length === 0" class="text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2">
                    {{ t('deployment.variables.noTeamsConfigured') }}
                  </div>
                </template>
              </div>

              <template v-else>
                <VariableInput
                  v-if="!isScoped(variable)"
                  :variable="variable"
                  :model-value="values[variable.name]"
                  @update:modelValue="(v) => (values[variable.name] = v)"
                  :filter-network-id="variable.osType === 'subnet' ? networkForSubnet : null"
                  :input-id="variable.name"
                />
                <div v-else class="space-y-3">
                  <div
                    v-if="slotKeysFor(variable).length === 0 && effectiveScope(variable) === 'team'"
                    class="text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2"
                  >
                    {{ t('deployment.variables.noTeamsConfigured') }}
                  </div>
                  <template v-if="effectiveScope(variable) === 'user'">
                    <div v-if="teams.length === 0" class="text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2">
                      {{ t('deployment.variables.noTeamsConfigured') }}
                    </div>
                    <div
                      v-for="team in teams"
                      :key="`${variable.name}::team::${team.name}`"
                      class="border-l-2 border-subtle pl-3 space-y-2"
                    >
                      <div class="text-xs font-semibold text-fg-muted uppercase tracking-wide">
                        {{ team.name }}
                      </div>
                      <div
                        v-for="member in team.members"
                        :key="`${variable.name}::${team.name}::${member.userId}`"
                        class="flex flex-col gap-1"
                      >
                        <label
                          :for="`${variable.name}__${userSlotKey(team.name, member.username)}`"
                          class="text-xs font-semibold text-fg-muted"
                        >
                          {{ member.username }}
                        </label>
                        <VariableInput
                          :variable="variable"
                          :model-value="getScopedValue(variable.name, userSlotKey(team.name, member.username))"
                          @update:modelValue="(v) => setScopedValue(variable.name, userSlotKey(team.name, member.username), v)"
                          :filter-network-id="variable.osType === 'subnet' ? networkForSubnet : null"
                          :input-id="`${variable.name}__${userSlotKey(team.name, member.username)}`"
                        />
                      </div>
                      <div v-if="team.members.length === 0" class="text-xs text-fg-muted italic">
                        {{ t('deployment.variables.noMembers') }}
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div
                      v-for="slotKey in slotKeysFor(variable)"
                      :key="`${variable.name}::${slotKey}`"
                      class="flex flex-col gap-1"
                    >
                      <label
                        :for="`${variable.name}__${slotKey}`"
                        class="text-xs font-semibold text-fg-muted"
                      >
                        {{ formatSlotLabel(variable, slotKey) }}
                      </label>
                      <VariableInput
                        :variable="variable"
                        :model-value="getScopedValue(variable.name, slotKey)"
                        @update:modelValue="(v) => setScopedValue(variable.name, slotKey, v)"
                        :filter-network-id="variable.osType === 'subnet' ? networkForSubnet : null"
                        :input-id="`${variable.name}__${slotKey}`"
                      />
                    </div>
                  </template>
                </div>
              </template>
            </div>
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