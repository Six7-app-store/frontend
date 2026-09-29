<script setup lang="ts">
/**
 * One variable of the wizard's variable step: its name with an info
 * tooltip, a marker error, type/required/scope badges, and the inputs —
 * a single one, one per team or person for scoped variables, or file
 * slots. Values are read and written through the step's form
 * (``useVariableForm``); only one tooltip of the step is open at a
 * time, so the parent owns which.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Info } from 'lucide-vue-next'
import VariableInput from '@/components/VariableInput.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ScopeBadge from '@/components/ui/ScopeBadge.vue'
import { effectiveVariableScope as effectiveScope } from '@/services/deployment-variables.service'
import { isList } from '@/services/variable-types'
import { isFileVariable as isFileVar, isScoped, userSlotKey } from '@/services/variable-form.service'
import type { VariableForm } from '@/composables/useVariableForm'
import type { AppVariable } from '@/types'

const props = defineProps<{
  variable: AppVariable
  form: VariableForm
  tooltipOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-tooltip'): void
}>()

const { t } = useI18n()
const {
  teams, values, formKey, slotKeysFor, getScopedValue, setScopedValue,
  getFileSlot, setFileSlot, networkForSubnet,
} = props.form

const focusInput = (id: string) => document.getElementById(id)?.focus()

// File variables take their scope from the ``@openstack:file:<scope>`` marker.
const slotScope = computed(() =>
  isFileVar(props.variable) ? (props.variable.osScope || 'all') : effectiveScope(props.variable))

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
</script>

<template>
  <div class="bg-panel rounded-lg p-4 border border-subtle shadow-sm">
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
        @click.stop="emit('toggle-tooltip')"
        class="text-fg-muted hover:text-fg-muted transition-colors "
        :class="tooltipOpen ? 'text-fg-muted' : ''"
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

    <div v-if="tooltipOpen" class="mb-3 bg-line/[.04] p-3 rounded-lg border border-subtle text-sm text-fg">
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

    <!-- Per-team and per-person values need teams to exist. -->
    <div
      v-if="slotScope !== 'all' && teams.length === 0"
      class="mb-3 text-xs text-warning bg-warning-dot/10 border border-warning-dot/30 rounded p-2"
    >
      {{ t('deployment.variables.noTeamsConfigured') }}
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
        <template v-if="effectiveScope(variable) === 'user'">
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
