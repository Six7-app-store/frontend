<script setup lang="ts">
/**
 * The files of one file variable in the start step.
 *
 * One file for everybody (``all``): a single drop zone. One per team or
 * person: one drop zone for all files at once, matched to the teams or
 * people by file name (``matchFiles``), and the list "x von y zugeordnet"
 * with "Datei wählen" for every row still without a file. Files go into
 * the existing slots of the draft, so the request does not change.
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle, CheckCircle2, X } from 'lucide-vue-next'
import FileDropZone from '@/components/FileDropZone.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import { useStudentDirectory } from '@/composables/useStudentDirectory'
import { fileKey, matchFiles, normalizeKey, personKeys, type FileTarget } from '@/services/file-matching.service'
import { fileScope, userSlotKey } from '@/services/variable-form.service'
import { variableDisplayDescription } from '@/services/deployment-variables.service'
import { acceptFor, readDeploymentFile, MAX_DEPLOYMENT_FILE_BYTES } from '@/utils/deployment-file'
import { userDisplayName } from '@/utils/user-display'
import type { VariableForm } from '@/composables/useVariableForm'
import type { AppVariable, DeploymentFile } from '@/types'

const props = defineProps<{
  variable: AppVariable
  form: VariableForm
  label: string
}>()

const { t } = useI18n()
const directory = useStudentDirectory()
const { teams, getFileSlot, setFileSlot } = props.form

const scope = computed(() => fileScope(props.variable))
const accept = computed(() => acceptFor(props.variable.fileExtensions))
const description = computed(() => variableDisplayDescription(props.variable.description))

/** Every slot of this variable with the names a file for it may carry. */
const targets = computed<FileTarget[]>(() => {
  if (scope.value === 'team') {
    return teams.value.map((team) => ({ slot: team.name, label: team.name, keys: [normalizeKey(team.name)] }))
  }
  return teams.value.flatMap((team) => team.members.map((member) => {
    const person = directory.studentOf(member.userId) ?? {}
    return {
      slot: userSlotKey(team.name, member.username),
      label: userDisplayName(person, member.username),
      keys: personKeys({ ...person, username: member.username }),
    }
  }))
})

interface Row { slot: string; label: string; file: DeploymentFile | null }
const rows = computed<Row[]>(() => targets.value.map((target) => ({
  slot: target.slot,
  label: target.label,
  file: getFileSlot(props.variable.name, target.slot),
})))
const assigned = computed(() => rows.value.filter((row) => row.file).length)
const missing = computed(() => rows.value.length - assigned.value)

const columns = computed<DataTableColumn[]>(() => [
  { id: 'label', label: scope.value === 'team' ? t('deployment.wizard.files.team') : t('deployment.wizard.files.person') },
  { id: 'status', label: t('deployment.wizard.files.status') },
  { id: 'action', label: t('deployment.wizard.files.action'), hideLabel: true, class: 'w-36', align: 'right' },
])

/** Names of dropped files that went nowhere, shown until the next drop. */
const unmatched = ref<string[]>([])

/** The name format the hint shows, from the first person or team. */
const example = computed(() => {
  const key = targets.value[0]?.keys[0] ?? (scope.value === 'team' ? 'team.1' : 'vorname.nachname')
  const ext = props.variable.fileExtensions?.[0] ?? 'txt'
  return `${key}.${ext}`
})

function onFiles(files: DeploymentFile[]) {
  const { bySlot, unmatched: left } = matchFiles(files.map((f) => f.name), targets.value)
  for (const [slot, index] of Object.entries(bySlot)) setFileSlot(props.variable.name, slot, files[index]!)
  unmatched.value = left.map((index) => files[index]!.name)
}

// One hidden input serves every row's "Datei wählen".
const rowInput = ref<HTMLInputElement | null>(null)
const pickingSlot = ref<string | null>(null)
const rowError = ref('')

function pickFor(slot: string) {
  pickingSlot.value = slot
  rowError.value = ''
  rowInput.value?.click()
}

async function onRowFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const slot = pickingSlot.value
  input.value = ''
  if (!file || !slot) return
  if (file.size > MAX_DEPLOYMENT_FILE_BYTES) {
    rowError.value = t('fileDropZone.tooLarge', { mb: Math.round(MAX_DEPLOYMENT_FILE_BYTES / 1024 / 1024) })
    return
  }
  try {
    setFileSlot(props.variable.name, slot, await readDeploymentFile(file))
    unmatched.value = unmatched.value.filter((name) => fileKey(name) !== fileKey(file.name))
  } catch {
    rowError.value = t('fileDropZone.readError')
  }
}
</script>

<template>
  <section class="flex flex-col gap-4" :data-testid="`file-variable-${variable.name}`">
    <div class="flex flex-col gap-1">
      <h2 class="text-xl font-semibold text-heading">
        {{ label }}
        <span v-if="!variable.required" class="text-sm font-normal text-fg-muted">({{ t('deployment.wizard.files.optional') }})</span>
      </h2>
      <p v-if="description" class="text-sm text-fg-muted">{{ description }}</p>
    </div>

    <FileDropZone
      v-if="scope === 'all'"
      :model-value="getFileSlot(variable.name, 'all')"
      :label="t('deployment.wizard.files.one')"
      :accept="accept"
      @update:model-value="(file) => setFileSlot(variable.name, 'all', file)"
    />

    <template v-else>
      <FileDropZone
        multiple
        :label="t('deployment.wizard.files.dropAll')"
        :hint="t('deployment.wizard.files.matchHint', { example })"
        :accept="accept"
        @files="onFiles"
      />

      <p v-if="unmatched.length" class="flex items-start gap-1.5 text-sm text-danger" role="alert" data-testid="unmatched-files">
        <AlertCircle :size="15" class="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{{ t('deployment.wizard.files.unmatched', { names: unmatched.join(', ') }) }}</span>
      </p>

      <div class="surface-panel overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3">
          <span class="text-base font-semibold" data-testid="files-assigned">
            {{ t('deployment.wizard.files.assigned', { assigned, total: rows.length }) }}
          </span>
          <span v-if="missing > 0" class="text-sm" :class="variable.required ? 'text-danger' : 'text-fg-muted'" data-testid="files-missing">
            {{ t('deployment.wizard.files.missing', { n: missing }, missing) }}
          </span>
        </div>
        <DataTable :columns="columns" :rows="rows" :row-key="(row) => row.slot" :caption="label" dense>
          <template #cell-status="{ row }">
            <span v-if="row.file" class="flex min-w-0 items-center gap-1.5 text-sm">
              <CheckCircle2 :size="15" class="shrink-0 text-success-dot" aria-hidden="true" />
              <span class="truncate">{{ t('deployment.wizard.files.done', { name: row.file.name }) }}</span>
            </span>
            <span v-else class="flex items-center gap-1.5 text-sm" :class="variable.required ? 'text-danger' : 'text-fg-muted'">
              <AlertCircle :size="15" class="shrink-0" aria-hidden="true" />
              {{ t('deployment.wizard.files.none') }}
            </span>
          </template>
          <template #cell-action="{ row }">
            <BaseButton
              v-if="row.file"
              variant="ghost"
              size="sm"
              icon
              :label="t('deployment.wizard.files.remove', { name: row.label })"
              @click="setFileSlot(variable.name, row.slot, null)"
            >
              <X :size="14" aria-hidden="true" />
            </BaseButton>
            <BaseButton v-else variant="secondary" size="sm" :data-testid="`pick-${row.slot}`" @click="pickFor(row.slot)">
              {{ t('deployment.wizard.files.pick') }}
            </BaseButton>
          </template>
        </DataTable>
      </div>

      <p v-if="rowError" class="flex items-center gap-1.5 text-sm text-danger" role="alert">
        <AlertCircle :size="15" class="shrink-0" aria-hidden="true" />
        {{ rowError }}
      </p>
      <input ref="rowInput" type="file" :accept="accept" class="hidden" data-testid="row-file-input" @change="onRowFile" />
    </template>
  </section>
</template>
