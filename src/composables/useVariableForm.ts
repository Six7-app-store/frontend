import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToast } from '@/composables/useToast'
import { useWizardTeams } from '@/composables/useWizardTeams'
import { templateKeyOf } from '@/services/deployment-variables.service'
import { releaseVersion } from '@/services/deployment-draft.service'
import { parseUserInputVar } from '@/services/deployment-input.service'
import {
  dedupeDefinitions,
  dropStaleSlots,
  formKeyFor,
  hydrateFromDraft,
  hydrateFromInput,
  isMultiImage as detectMultiImage,
  missingRequired as findMissingRequired,
  serializeValues,
  slotKeysFor as slotsOf,
  type FormValues,
} from '@/services/variable-form.service'
import type { AppVariable, DeploymentFile } from '@/types'

/**
 * State of the variable step: the app's variable definitions, the values
 * the user edits, and writing them to the draft. The rules themselves are
 * in ``services/variable-form.service``; this adds loading, the draft, and
 * the reaction to renamed teams.
 */
export function useVariableForm() {
  const { t } = useI18n()
  const deploymentStore = useDeploymentStore()
  const appStore = useAppStore()
  const toast = useToast()
  const teams = useWizardTeams()

  const isLoading = ref(false)
  const variables = ref<AppVariable[]>([])
  const values = ref<FormValues>({})

  const multiImage = computed(() => detectMultiImage(variables.value))
  const formKey = (v: AppVariable) => formKeyFor(v, multiImage.value)
  const slotKeysFor = (v: AppVariable) => slotsOf(v, teams.value)

  const packerByTemplate = computed<Record<string, AppVariable[]>>(() => {
    const out: Record<string, AppVariable[]> = {}
    for (const v of variables.value) {
      if (v.source === 'packer') (out[templateKeyOf(v)] ??= []).push(v)
    }
    return out
  })
  const templateKeys = computed(() => Object.keys(packerByTemplate.value).sort())
  const packerVariables = computed(() => Object.values(packerByTemplate.value).flat())
  const terraformVariables = computed(() => variables.value.filter((v) => v.source === 'terraform'))

  const missingRequired = computed(() =>
    findMissingRequired(variables.value, values.value, teams.value, multiImage.value))
  const canSubmit = computed(() => missingRequired.value.length === 0)

  const reportMarkerErrors = () => {
    const bad = variables.value.filter((v) => v.markerError)
    if (bad.length === 0) return
    const lines = bad.map((v) => {
      const loc = v.markerError?.location ? ` (${v.markerError.location})` : ''
      return `• ${v.markerError?.variable}${loc}: ${v.markerError?.message}`
    })
    toast.error(t('deployment.variables.markerErrorToast', { count: bad.length, lines: lines.join('\n') }))
  }

  /**
   * Restores the definitions and values from the draft when the user comes
   * back to this step; otherwise loads the definitions of the chosen
   * release and warms the OpenStack name cache for their pickers.
   */
  const load = async () => {
    const draft = deploymentStore.draft
    if (draft.variableDefinitions && draft.variableDefinitions.length > 0) {
      variables.value = draft.variableDefinitions
      values.value = hydrateFromDraft(variables.value, (draft.variables || {}) as Record<string, any>,
        teams.value, multiImage.value)
      return
    }

    isLoading.value = true
    try {
      const fetched = await appStore.fetchAppVariables(draft.appId!, releaseVersion(draft.releaseTag))
      variables.value = dedupeDefinitions(fetched)
      draft.variableDefinitions = variables.value

      const osTypes = new Set(
        variables.value.map((v) => v.osType).filter((type): type is NonNullable<typeof type> => !!type && type !== 'file'),
      )
      if (osTypes.size > 0) {
        const { ensureLoaded } = await import('@/composables/useOpenStackResourceCache')
        await Promise.allSettled([...osTypes].map((type) => ensureLoaded(type as any)))
      }

      let saved: Record<string, any> = {}
      try {
        saved = parseUserInputVar(draft.userInputVar)
      } catch {
        toast.error(t('deployment.summary.invalidJson'))
      }
      values.value = hydrateFromInput(variables.value, saved, teams.value, multiImage.value)
    } catch (error) {
      console.error(error)
      toast.error(t('deployment.summary.fetchVarsError'))
    } finally {
      isLoading.value = false
    }
    reportMarkerErrors()
  }

  /** Writes the values to the draft; false when that failed (a toast says so). */
  const save = (): boolean => {
    try {
      const { changed, all } = serializeValues(variables.value, values.value, multiImage.value)
      deploymentStore.draft.userInputVar = JSON.stringify(changed) as any
      deploymentStore.draft.variables = all
      return true
    } catch (e) {
      console.error(e)
      toast.error(t('deployment.variables.saveError'))
      return false
    }
  }

  // A scoped value v-model: one slot of the variable's slot map.
  const getScopedValue = (key: string, slot: string): any => {
    const map = values.value[key]
    return map && typeof map === 'object' && !Array.isArray(map) ? (map[slot] ?? '') : ''
  }
  const setScopedValue = (key: string, slot: string, value: any): void => {
    const map = values.value[key]
    if (!map || typeof map !== 'object' || Array.isArray(map)) values.value[key] = {}
    values.value[key][slot] = value
  }

  // File variables live in draft.fileUploads, per slot ("all", a team, a person).
  const getFileSlot = (varName: string, slot: string): DeploymentFile | null =>
    deploymentStore.draft.fileUploads?.[varName]?.[slot] || null
  const setFileSlot = (varName: string, slot: string, file: DeploymentFile | null) => {
    const draft = deploymentStore.draft
    const uploads = (draft.fileUploads ??= {})
    const slots = (uploads[varName] ??= {})
    if (file === null) delete slots[slot]
    else slots[slot] = file
  }

  /** The chosen network (id mode) that limits a subnet picker, if any. */
  const networkForSubnet = computed<string | null>(() => {
    const network = variables.value.find((v) => v.osType === 'network' && v.osMode === 'id')
    const value = network ? values.value[network.name] : null
    return typeof value === 'string' && value.trim() ? value : null
  })

  // A renamed or removed team must not keep values under its old slots.
  watch(teams, () => {
    if (!variables.value.length) return
    const dropped = dropStaleSlots(variables.value, values.value, teams.value, multiImage.value)
    if (dropped.length > 0) {
      toast.info(t('deployment.variables.teamRenameToast', { count: dropped.length, lines: dropped.join('\n') }))
    }
  }, { deep: true })

  return {
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
  }
}

export type VariableForm = ReturnType<typeof useVariableForm>
