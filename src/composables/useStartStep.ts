import { computed, ref, watch } from 'vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useStudentDirectory } from '@/composables/useStudentDirectory'
import { useVariableForm } from '@/composables/useVariableForm'
import { missingFiles, startSections, withoutStaleFileSlots } from '@/services/variable-form.service'
import type { BlockReason } from '@/composables/useDeploymentWizard'

/**
 * State of the wizard's start step on top of the variable form: the app's
 * variables split into required inputs, files and "Erweitert", every edit
 * written to the draft at once (so a reload keeps it), and why the
 * deployment cannot start yet.
 *
 * The people's names are loaded first: per-person slots are keyed by
 * username, and after a reload the directory is empty.
 */
export function useStartStep() {
  const store = useDeploymentStore()
  const directory = useStudentDirectory()
  const form = useVariableForm()
  const ready = ref(false)

  const sections = computed(() => startSections(form.variables.value))
  const filesMissing = computed(() =>
    missingFiles(form.variables.value, store.draft.fileUploads, form.teams.value))

  const reason = computed<BlockReason | null>(() => {
    if (!ready.value || form.isLoading.value) return { key: 'deployment.wizard.block.loading' }
    const inputs = form.missingRequired.value.length
    if (inputs > 0) return { key: 'deployment.wizard.block.missingInputs', params: { n: inputs }, plural: inputs }
    if (form.outOfRange.value.length > 0) return { key: 'deployment.wizard.block.outOfRange' }
    const files = filesMissing.value.length
    if (files > 0) return { key: 'deployment.wizard.block.missingFiles', params: { n: files }, plural: files }
    return null
  })

  async function load() {
    ready.value = false
    await directory.ensureLoaded(store.draft.studentIds)
    await form.load()
    store.draft.fileUploads = withoutStaleFileSlots(form.variables.value, store.draft.fileUploads, form.teams.value)
    form.save()
    ready.value = true
  }

  watch(form.values, () => { if (ready.value) form.save() }, { deep: true })

  return { form, ready, sections, filesMissing, reason, load }
}
