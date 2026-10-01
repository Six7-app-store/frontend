<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToast } from '@/composables/useToast'
import { getErrorStatus } from '@/utils/http-error'
import { fileSummaries, packerRows, terraformRows, type SummaryContext } from '@/services/deployment-summary.service'
import { formatSubmitError } from '@/services/deployment-submit-error.service'
import WizardStepLayout from '@/components/deployment-wizard/WizardStepLayout.vue'
import Spinner from '@/components/ui/Spinner.vue'
import SummaryVariableCard from '@/components/deployment-wizard/SummaryVariableCard.vue'
import { Box, FileText, Layers, Pencil } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Card from '@/components/ui/Card.vue'
import InfoList, { type InfoItem } from '@/components/ui/InfoList.vue'
import type { AppVariable } from '@/types'
import type { OsResourceType } from '@/api/openstack-resources.api'
import { userDisplayName } from '@/utils/user-display'
import { releaseVersion } from '@/services/deployment-draft.service'
import { parseUserInputVar } from '@/services/deployment-input.service'
import {
  ensureLoaded as ensureOsCacheLoaded,
  getDisplayName as getOsDisplayName,
} from '@/composables/useOpenStackResourceCache'

// ``AppVariable.osType`` may include the pseudo-type ``file``, but the
// cache only knows real OpenStack resource types. Callers below already
// filter ``file`` out at runtime — this helper makes the type system
// agree.
const asOsResourceType = (t: NonNullable<AppVariable['osType']>) =>
  t as OsResourceType

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const toast = useToast()

// State
const isLoadingVariables = ref(false)
const appVariables = ref<AppVariable[]>([])
// Local submit lock. Prevents a double-submit between the first click and the
// moment the store sets ``isLoading`` (there's at least one API roundtrip in
// between). Also read by the button display.
const isSubmitting = ref(false)

const selectedApp = computed(() => {
  return appStore.apps.find(a => a.appId === deploymentStore.draft.appId)
})

const version = computed(() => releaseVersion(deploymentStore.draft.releaseTag))

// Group Mode Display
const groupModeDisplay = computed(() => {
  const mode = deploymentStore.draft.groupMode
  if (mode === 'one') return t('deployment.groups.one')
  if (mode === 'eachUser') return t('deployment.groups.eachUser')
  return t('deployment.groups.custom')
})

const baseFacts = computed<InfoItem[]>(() => [
  { label: t('deployment.summary.deploymentNameLabel'), value: deploymentStore.draft.name || '-' },
  { label: t('deployment.summary.appLabel'), value: selectedApp.value?.name || t('deployment.summary.appNotFound') },
  { label: t('deployment.summary.versionLabel'), value: version.value, mono: true },
])

const teamFacts = computed<InfoItem[]>(() => [
  { label: t('deployment.summary.teamCountLabel'), value: deploymentStore.draft.groupCount },
  { label: t('deployment.summary.modeLabel'), value: groupModeDisplay.value },
])

// Display names come from the OpenStack cache; reading it inside these
// computeds makes them re-run once the cache is filled (see
// ``useOpenStackResourceCache``).
const summaryContext: SummaryContext = {
  t,
  osName: (osType, mode, value) => getOsDisplayName(osType as OsResourceType, mode, value)?.name ?? null,
}

const packerVars = computed(() =>
  packerRows(appVariables.value || [], deploymentStore.draft.variables, summaryContext))

const terraformVars = computed(() =>
  terraformRows(appVariables.value || [], deploymentStore.draft.variables, summaryContext))

const fileVarSummaries = computed(() =>
  fileSummaries(appVariables.value || [], deploymentStore.draft.fileUploads))

/**
 * Ensures the display cache is loaded for all OS resource types present in the
 * current variables. Called in the mount path after the variable definitions
 * are available.
 *
 * Race-tolerant: ``ensureLoaded`` deduplicates parallel calls, so the backend
 * only gets one roundtrip per type. Computeds calling ``getDisplayName`` re-run
 * automatically once the cache updates (see ``cacheVersion``).
 */
async function primeOsDisplayCache(defs: AppVariable[]): Promise<void> {
  const types = new Set<NonNullable<AppVariable['osType']>>()
  for (const def of defs) {
    // ``file`` is a frontend-only pseudo-type — the resource cache only
    // tracks real OpenStack resources, so skip it here.
    if (def.osType && def.osType !== 'file') types.add(def.osType)
  }
  if (types.size === 0) return
  await Promise.all([...types].map((t) => ensureOsCacheLoaded(asOsResourceType(t))))
}

// --- 1. Load logic & merge ---
const fetchAndSyncVariables = async () => {
  // A cache hit from step 3 takes absolute priority. When the user
  // reached this page through the wizard, NewDeploymentVariableView has
  // already stored the definitions in the draft, so we can show them
  // immediately — without waiting for ``appStore.fetchApps`` and without
  // tripping the ``selectedApp`` guard below.
  //
  // Earlier versions read the cache only AFTER the guard. As soon as
  // ``selectedApp`` could not be resolved for any reason (apps not yet in
  // the store, direct call to the summary route, filtered app list), the
  // function returned early and ``appVariables.value`` stayed ``[]`` —
  // the summary showed "No Packer/Terraform variables" even though the
  // draft held the definitions.
  const cached = deploymentStore.draft.variableDefinitions
  if (cached && cached.length > 0) {
    appVariables.value = cached
    await primeOsDisplayCache(cached)
    return
  }

  // Make sure apps are loaded.
  if (appStore.apps.length === 0) {
    await appStore.fetchApps()
  }

  if (!selectedApp.value?.appId) {
    console.warn('No app selected or app not found')
    return
  }

  isLoadingVariables.value = true

  try {
    // A. Load API variables — only reached when the cache from step 3 was
    // empty. The backend endpoint sparse-clones the app repo and parses
    // variables.tf, which can take a few seconds. This fetch is the fallback
    // for deep-link / reload.
    let variables: AppVariable[] = []
    try {
      variables = (await appStore.fetchAppVariables(selectedApp.value.appId, version.value)) ?? []
      deploymentStore.draft.variableDefinitions = variables
    } catch (varError: any) {
      console.warn('Could not load variables:', varError)
      // Re-throw so the outer catch block shows the toast.
      throw varError
    }
    appVariables.value = variables

    // C. Parse user input.
    let userOverrides: Record<string, any> = {}
    try {
      userOverrides = parseUserInputVar(deploymentStore.draft.userInputVar)
    } catch {
      toast.error(t('deployment.summary.invalidJson'))
    }

    // D. Initialize draft
    if (!deploymentStore.draft.variables) {
      deploymentStore.draft.variables = {}
    }

    // E. Merge
    variables.forEach((v) => {
      if (deploymentStore.draft.variables![v.name] === undefined && v.default !== undefined) {
        deploymentStore.draft.variables![v.name] = v.default
      }
    })

    Object.keys(userOverrides).forEach(key => {
       deploymentStore.draft.variables![key] = userOverrides[key]
    })

    // F. Prime the display cache for OS-marker variables so the summary cards
    // show resource names instead of UUIDs. Async: the initial pass shows UUIDs
    // and the computeds re-render names once the cache lands.
    primeOsDisplayCache(appVariables.value)

  } catch (error: any) {
    console.error(error)
    let msg = t('deployment.summary.fetchVarsError')
    if (getErrorStatus(error) === 500) msg = t('deployment.summary.fetchVarsError500')
    
    toast.error(msg)
  } finally {
    isLoadingVariables.value = false
  }
}

onMounted(() => {
  fetchAndSyncVariables()
})

// --- Actions ---
const handleCustomize = () => {
  // Navigate to the variables page.
  router.push({ name: ROUTE_NAMES.deploymentVariables })
}

const handleDeploy = async () => {
  // Local lock before any await. The store's isLoading flag only flips inside
  // ``submitDraft``, so a second click before then would start a second
  // deployment-creation roundtrip.
  if (isSubmitting.value) return
  isSubmitting.value = true

  try {
    // The draft already carries ``userId``s — the picker keys on them, and so
    // does the backend. There used to be a translation step here that fetched
    // every user to map Keycloak ids onto user ids, plus a transient patch of
    // the draft and a rollback on failure. All of it is gone: the ids were
    // Keycloak-shaped only because the wizard identified students by
    // ``keycloak_id``, which silently lost everybody without one.
    let deployment: any
    try {
      deployment = await deploymentStore.submitDraft()
    } catch (err: any) {
      // Backend returns ``{detail: {reason, variable, slot, limit_bytes,
      // actual_bytes, ...}}`` for size/extension/encoding violations (413/422).
      // Branch on ``reason`` and format a localized message with the size numbers.
      toast.error(formatSubmitError(err, t))
      return
    }

    if (deployment?.deploymentId) {
      // Created successfully → reset the draft so the next wizard run starts clean.
      deploymentStore.resetDraft()
      toast.success(t('deployment.summary.submitSuccess'))
      await router.push({ name: ROUTE_NAMES.deploymentsList })
    }
  } finally {
    isSubmitting.value = false
  }
}

const handleBack = () => {
    // Back leads to the variables page (step 3).
    router.push({ name: ROUTE_NAMES.deploymentVariables })
}
</script>

<template>
  <WizardStepLayout
    :step="4"
    :title="t('deployment.summary.title')"
    :subtitle="t('deployment.summary.subtitle')"
    :next-label="t('deployment.actions.deploy')"
    :next-disabled="isLoadingVariables"
    :busy="isSubmitting || deploymentStore.isLoading"
    :busy-label="t('deployment.summary.creating')"
    @back="handleBack"
    @next="handleDeploy"
  >
    <div v-if="isLoadingVariables" class="flex flex-col items-center justify-center py-12 gap-3">
      <Spinner />
      <span class="text-fg-muted text-sm">{{ t('deployment.summary.loadingConfig') }}</span>
    </div>

    <div v-else class="flex flex-col gap-section">
      <Card :title="t('deployment.summary.baseConfigTitle')">
        <div class="flex flex-col gap-4">
          <InfoList :items="baseFacts" />
          <div class="flex flex-col gap-2 border-t border-faint pt-4">
            <p class="text-sm text-fg-muted">
              {{ t('deployment.summary.selectedStudents', { count: deploymentStore.draft.studentIds.length }) }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <Badge v-for="studentId in deploymentStore.draft.studentIds" :key="studentId">
                {{ userDisplayName(deploymentStore.studentCache.get(studentId), studentId) }}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card :title="t('deployment.summary.teamAssignmentTitle')">
        <div class="flex flex-col gap-4">
          <InfoList :items="teamFacts" />
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(assignments, index) in deploymentStore.draft.assignments"
              :key="index"
              class="rounded-panel border border-subtle p-4"
            >
              <div class="mb-2 flex items-baseline justify-between gap-2">
                <p class="font-semibold text-heading">
                  {{ deploymentStore.draft.groupNames[index] || t('deployment.assignment.vmDefaultName', { index: index + 1 }) }}
                </p>
                <span class="text-sm tabular-nums text-fg-muted">
                  {{ t('deployment.assignment.userCount', { count: assignments?.length || 0 }) }}
                </span>
              </div>
              <ul class="max-h-32 overflow-y-auto text-sm text-fg-body">
                <li v-for="studentId in assignments" :key="studentId" class="py-0.5">
                  {{ userDisplayName(deploymentStore.studentCache.get(studentId), studentId) }}
                </li>
              </ul>
              <p v-if="!assignments || assignments.length === 0" class="text-sm text-fg-muted">
                {{ t('deployment.summary.noUsersAssigned') }}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card :title="t('deployment.summary.variablesConfigTitle')">
        <template #actions>
          <BaseButton variant="secondary" size="sm" @click="handleCustomize">
            <Pencil :size="14" aria-hidden="true" />
            {{ t('deployment.summary.editBtn') }}
          </BaseButton>
        </template>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SummaryVariableCard :title="t('deployment.summary.packerVars')" :icon="Box" :rows="packerVars"
            :empty-label="t('deployment.summary.noPackerVars')" />

          <SummaryVariableCard :title="t('deployment.summary.terraformVars')" :icon="Layers" :rows="terraformVars"
            :empty-label="t('deployment.summary.noTerraformVars')" />

          <!-- One entry per file variable; chips list the uploaded slots
               (filename + size). Hidden when the app declares no file variables. -->
          <div
            v-if="fileVarSummaries.length > 0"
            class="overflow-hidden rounded-panel border border-subtle lg:col-span-2"
          >
            <div class="flex items-center gap-2 border-b border-faint bg-line/[.03] px-4 py-2">
              <FileText :size="16" class="text-icon" aria-hidden="true" />
              <h4 class="text-sm font-semibold text-heading">{{ t('deployment.summary.uploadedFiles') }}</h4>
              <span class="ml-auto text-sm tabular-nums text-fg-muted">
                {{ fileVarSummaries.reduce((acc, v) => acc + v.chips.length, 0) }}
              </span>
            </div>
            <div class="flex flex-col gap-3 p-4">
              <div v-for="entry in fileVarSummaries" :key="entry.name">
                <div class="mb-1 text-sm text-fg">
                  <span class="font-mono">{{ entry.name }}</span>
                  <span class="ml-1 text-fg-muted">({{ t('deployment.summary.fileScope', { scope: entry.scope }) }})</span>
                </div>
                <p v-if="entry.chips.length === 0" class="text-sm text-fg-muted">
                  {{ t('deployment.summary.noFileUploaded') }}
                </p>
                <div v-else class="flex flex-wrap gap-1.5">
                  <span
                    v-for="chip in entry.chips"
                    :key="`${entry.name}::${chip.slot}`"
                    class="code-chip inline-flex items-center gap-1"
                  >
                    {{ chip.filename }} · {{ chip.size }}<template v-if="entry.scope !== 'all'"> · {{ chip.slot }}</template>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

  </WizardStepLayout>
</template>