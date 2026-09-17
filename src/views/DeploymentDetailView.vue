<script lang="ts" setup>
import { CircleArrowLeft, Settings, Loader2, Terminal, ChevronDown, AlertCircle, Copy, Check } from 'lucide-vue-next'
import DeploymentDetailHeader from '@/components/deployment/DeploymentDetailHeader.vue'
import DeploymentOverviewCards from '@/components/deployment/DeploymentOverviewCards.vue'
import DeploymentGroupsCard from '@/components/deployment/DeploymentGroupsCard.vue'
import DeploymentVariablesCard from '@/components/deployment/DeploymentVariablesCard.vue'
import DeploymentActiveTaskCard from '@/components/deployment/DeploymentActiveTaskCard.vue'
import DeploymentTeamsCard from '@/components/deployment/DeploymentTeamsCard.vue'
import DeploymentInfrastructureSection from '@/components/deployment/DeploymentInfrastructureSection.vue'
import DeploymentDeleteModal from '@/components/deployment/DeploymentDeleteModal.vue'
import DeploymentRedeployModal from '@/components/deployment/DeploymentRedeployModal.vue'
import DeploymentPauseResumeModal from '@/components/deployment/DeploymentPauseResumeModal.vue'
import { useRoute } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAuthStore } from '@/stores/auth.store'
import { ref, computed, onMounted } from 'vue'
import type { Task } from '@/types'
import InfrastructureVmDrawer from '@/components/InfrastructureVmDrawer.vue'
import { formatDateTime } from '@/utils/format'
import { prettyJson, highlightJson } from '@/utils/json-display'
import { countLogEntries, splitTaskLogs, countTfResources } from '@/utils/task-logs'
import { provideCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useDeploymentOwnerView } from '@/composables/useDeploymentOwnerView'
import { useDeploymentTasks } from '@/composables/useDeploymentTasks'
import { useDeploymentLiveStream } from '@/composables/useDeploymentLiveStream'
import { useDeploymentCredentials } from '@/composables/useDeploymentCredentials'
import { useDeploymentResources } from '@/composables/useDeploymentResources'
import { useDeploymentLifecycle } from '@/composables/useDeploymentLifecycle'
import { useResendAccess } from '@/composables/useResendAccess'
import { selectHistoryTasks } from '@/services/deployment-tasks.service'
import { parseDeploymentGroups, parseDeploymentVariables } from '@/services/deployment-input.service'
import { getStatusStyles } from '@/utils/deployment-status-styles'


const route = useRoute()
const deploymentStore = useDeploymentStore()
const authStore = useAuthStore()

const deploymentId = route.params.id as string

const deployment = computed(() => deploymentStore.currentDeployment)

// Owner-view vs member-view — gates tasks/logs, lifecycle actions, the
// live stream and other members' resend buttons (see ``useDeploymentOwnerView``).
const { isOwnerView } = useDeploymentOwnerView(deployment)

// Task list, active task, opened task detail and the newest task's
// outputs (see ``useDeploymentTasks``).
const {
    tasks,
    loadingTasks,
    activeTask,
    selectedTask,
    loadingTaskDetail,
    activeDataTask,
    loadTasks,
    loadLatestTaskOutputs,
    selectTask,
    deselectTask,
} = useDeploymentTasks(deploymentId, isOwnerView)

// Teams with each member's access credentials: owners read them from the
// active data task's outputs, members from ``/my-access``
// (see ``useDeploymentCredentials``).
const { enrichedTeams, loadMyAccess } = useDeploymentCredentials(deploymentId, deployment, activeDataTask)

// Counts the resources in the selected task's state for the header
// sub-headline (``countTfResources`` in ``utils/task-logs``).
const tfResourcesCount = computed(() => countTfResources(selectedTask.value?.tf_state))

// ----------------------------------------------------------------
// INFRASTRUCTURE TAB — Stage-1 list + Stage-2 drawer + redeploy
// ----------------------------------------------------------------
//
// Resource list, VM drawer and the per-VM redeploy flow live in
// ``useDeploymentResources``.
const {
    resourcesLoading,
    resourcesError,
    vmResources,
    networkResources,
    securityResources,
    redeployInFlight,
    openDrawerAddress,
    showRedeployModal,
    redeployTargetAddress,
    loadResources,
    openVmDrawer,
    closeVmDrawer,
    redeployVm,
    confirmRedeploy,
} = useDeploymentResources({
    deploymentId,
    isOwnerView,
    onRedeployStarted: loadTasks,
})

onMounted(async () => {
    await deploymentStore.fetchDeploymentById(deploymentId)
    await loadTasks() // Loads the history into tasks.value

    if (isOwnerView.value) {
        // Owner view: seed the top outputs from the latest task so the
        // page can render the summary before the first SSE event arrives.
        await loadLatestTaskOutputs()
    } else {
        // Member view: the owner-only task outputs are off-limits, so
        // fetch just this member's own credentials from ``/my-access``.
        await loadMyAccess()
    }

    // Fire the resource load in parallel — it's a separate roundtrip
    // (OpenStack live-fetch can take ~1s) and the page should render
    // its other panels while it's in flight.
    loadResources()
})

// ----------------------------------------------------------------
// LIVE STREAM (progress bar + log tail)
// ----------------------------------------------------------------
//
// Stream wiring, DB seed and stepper values live in
// ``useDeploymentLiveStream``.
//
// Refs are destructured out of the composable so Vue's template
// auto-unwrap recognises them as top-level setup bindings — without
// destructuring, ``stream.currentPhase`` in the template would be the
// ref *object*, not the string, and downstream calls like
// ``phase.split(...)`` would crash.
const {
    progress: streamProgress,
    currentPhase: streamCurrentPhase,
    currentPhaseIndex: streamCurrentPhaseIndex,
    liveLogs: streamLiveLogs,
    totalLogCount: streamTotalLogCount,
    connectionState: streamConnectionState,
    isStreamRelevant,
    phaseStepCount,
    phaseStepLabel,
    activeStepIndex: currentPhaseIndex,
} = useDeploymentLiveStream({
    deploymentId,
    isOwnerView,
    activeTask,
    onStreamFinished: () => {
        // Refresh the task list once on completion so the final
        // logs/outputs land in the static rendering below.
        loadTasks()
        // A redeploy task that just finished produces a new TF
        // state — reload the resource list so the redrawn card
        // reflects post-apply lifecycle. We also clear the
        // in-flight set; whichever address was waiting on this
        // task is now in the freshly-fetched list.
        redeployInFlight.value.clear()
        loadResources()
    },
})

// Tasks that aren't the currently running one. Shown as the history
// list below the active-task card so the running task isn't rendered
// twice (once in the live block, once in the static list).
const historyTasks = computed<Task[]>(() =>
    selectHistoryTasks(tasks.value, activeTask.value, isStreamRelevant.value)
)

// Delete + Pause/Resume (availability, modals, handlers) and the reaction
// once a lifecycle stream has ended (see ``useDeploymentLifecycle``).
// Called after ``useDeploymentLiveStream`` so the stream-ended watcher
// registers after the stream's own watchers.
const {
    canDelete,
    deleteDisabledReason,
    canPauseOrResume,
    pauseResumeAction,
    showDeleteModal,
    showPauseResumeModal,
    pauseResumeBusy,
    confirmDelete,
    confirmPauseResume,
} = useDeploymentLifecycle({
    deploymentId,
    deployment,
    isOwnerView,
    tasks,
    activeTask,
    connectionState: streamConnectionState,
    loadTasks,
})

// Copy-to-clipboard state, shared page-wide: only one button can be the
// "just copied" target at a time. Provided to the child components
// (e.g. the Teams card) via ``provideCopyToClipboard``.
const { copiedKey, copyToClipboard } = provideCopyToClipboard()

// Count of log entries inside ``selectedTask.logs`` for the badge in
// the Logs card header; ``null`` hides the badge. The wire shapes are
// documented on ``countLogEntries`` in ``utils/task-logs``.
const logEntryCount = computed<number | null>(() => countLogEntries(selectedTask.value?.logs))

// Groups and variables from the persisted wizard input
// (see ``services/deployment-input.service``).
const groups = computed(() => parseDeploymentGroups(deployment.value?.userInputVar))

const deploymentVariables = computed(() => parseDeploymentVariables(deployment.value?.userInputVar))

// ``logs`` can be either a backend-formatted ``Task failed: ...`` string
// (the failure shape this splitter cares about) or a structured
// ``TaskLogsObject`` for normal runs. Only the string form triggers the
// headline/details split — anything else falls through to the generic
// pretty-print path below.
const taskLogsSplit = computed(() => {
  const raw = selectedTask.value?.logs
  return splitTaskLogs(typeof raw === 'string' ? raw : null)
})
const showTaskLogsTrace = ref(false)

// Resend-access buttons: per-user send state and the busy gate
// (see ``useResendAccess``).
const { isDeploymentBusy, resendState, resendAccess } = useResendAccess({
    deploymentId,
    deployment,
    activeTask,
})

const formatDate = formatDateTime

</script>

<template>
    <div v-if="deployment" class="space-y-6">
        <!--
            Two-column layout: the deployment detail content stays on the left,
            and the VM-detail sidebar anchors as a sticky right column when an
            inline VM is selected. The left column expands to full width otherwise.
        -->
        <div class="flex gap-6 items-start">
            <div class="flex-1 min-w-0 space-y-6">

        <!-- Header with back button and status badge -->
        <DeploymentDetailHeader
            :deployment="deployment"
            :is-owner-view="isOwnerView"
            :can-delete="canDelete"
            :delete-disabled-reason="deleteDisabledReason"
            :can-pause-or-resume="canPauseOrResume"
            :pause-resume-action="pauseResumeAction"
            :pause-resume-busy="pauseResumeBusy"
            @delete="showDeleteModal = true"
            @pause-resume="showPauseResumeModal = true"
        />

        <!-- Main info grid with 3 cards -->
        <DeploymentOverviewCards :deployment="deployment" />

        <!-- Groups section -->
        <DeploymentGroupsCard :groups="groups" />

        <!-- Deployment Variables -->
        <DeploymentVariablesCard :variables="deploymentVariables" />

        <!-- Latest task info is shown inline in the Active Task card
             below while the deployment is running, and inline in the
             Tasks & Logs history once it has finished. The previous
             standalone "Latest Task" row was redundant with both. -->

        <!-- Active Task — live progress + log tail for the currently
             running task. Replaces the previous mix of "Latest Task"
             info card + duplicate entry in the Tasks & Logs list. -->
        <DeploymentActiveTaskCard
            v-if="isStreamRelevant && activeTask"
            :active-task="activeTask"
            :stream-connection-state="streamConnectionState"
            :stream-current-phase-index="streamCurrentPhaseIndex"
            :stream-current-phase="streamCurrentPhase"
            :stream-progress="streamProgress"
            :phase-step-count="phaseStepCount"
            :phase-step-label="phaseStepLabel"
            :current-phase-index="currentPhaseIndex"
            :stream-live-logs="streamLiveLogs"
            :stream-total-log-count="streamTotalLogCount"
        />

        <!-- Teams & Members section — appears above Infrastructure so
             the human-readable view (who has access to what) precedes
             the technical resource listing. -->
        <DeploymentTeamsCard
            :teams="deployment.teams"
            :enriched-teams="enrichedTeams"
            :is-owner-view="isOwnerView"
            :current-user-id="authStore.userId"
            :resend-state="resendState"
            :is-deployment-busy="isDeploymentBusy"
            @resend="resendAccess"
        />

        <!-- Infrastructure section — per-VM cards + read-only listings.
             Owner-only (the backend gates it the same way); members
             skip the section entirely so they don't see an empty/
             permission-error panel. Visually mirrors the other
             page sections (Teams, Tasks, Outputs): same
             ``bg-white rounded-xl border ... p-6 shadow-sm`` shell,
             same icon-tile header, same sub-section spacing. -->
        <DeploymentInfrastructureSection
            v-if="isOwnerView"
            :resources-loading="resourcesLoading"
            :resources-error="resourcesError"
            :vm-resources="vmResources"
            :network-resources="networkResources"
            :security-resources="securityResources"
            :redeploy-in-flight="redeployInFlight"
            :open-drawer-address="openDrawerAddress"
            @refresh="loadResources()"
            @open-details="openVmDrawer"
            @redeploy="redeployVm"
        />

        <!-- Tasks / Logs Section — history of finished tasks. The active
             task (if any) is rendered above in its own card, so the
             list filters it out to avoid double-rendering.
             Only the deployment owner / staff sees the actual task
             contents — members get a placeholder card instead so the
             page layout stays consistent across roles. -->
        <div v-if="!isOwnerView" class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center gap-3 mb-3">
                <div class="p-2 bg-gray-100 rounded-lg">
                    <Terminal :size="20" class="text-gray-400" />
                </div>
                <span class="text-lg font-semibold text-gray-700">{{ $t('DeploymentDetailView.tasksAndLogs') }}</span>
            </div>
            <div class="text-sm text-gray-500 flex items-start gap-2 px-2">
                <AlertCircle :size="16" class="text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{{ $t('DeploymentDetailView.tasksOwnerOnly') }}</span>
            </div>
        </div>
        <div v-else class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-gray-100 rounded-lg">
                        <Terminal :size="20" class="text-gray-600" />
                    </div>
                    <span class="text-lg font-semibold text-gray-900">
                        {{ isStreamRelevant ? 'Task History' : 'Tasks & Logs' }}
                    </span>
                    <span v-if="historyTasks.length > 0"
                        class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                        {{ historyTasks.length }}
                    </span>
                </div>
                <button v-if="selectedTask" @click="deselectTask"
                    class="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm">
                    <CircleArrowLeft :size="16" />
                    <span>Back to list</span>
                </button>
            </div>

            <!-- Task List View -->
            <div v-if="!selectedTask">
                <div v-if="loadingTasks" class="flex justify-center py-10">
                    <Loader2 class="animate-spin text-primary" :size="32" />
                </div>

                <div v-else-if="historyTasks.length === 0" class="text-center py-10 text-gray-500">
                    {{ isStreamRelevant ? 'No previous tasks for this deployment.' : 'No tasks found' }}
                </div>

                <div v-else class="space-y-2">
                    <div v-for="task in historyTasks" :key="task.taskId" @click="selectTask(task)"
                        class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 hover:border-primary/30">
                        <div class="flex items-center gap-4 flex-1">
                            <component :is="getStatusStyles(task.status).icon" :size="18" :class="task.status === 'success' ? 'text-green-600' :
                                task.status === 'failed' ? 'text-red-600' :
                                    task.status === 'running' ? 'text-blue-600' : 'text-yellow-600'" />
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-1">
                                    <span class="font-medium text-gray-900 capitalize">{{ task.type }}</span>
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize"
                                        :class="getStatusStyles(task.status).badgeClass">
                                        {{ task.status }}
                                    </span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    Created: {{ formatDate(task.created_at) }}
                                </div>
                            </div>
                        </div>
                        <ChevronDown :size="20" class="text-gray-400 transform -rotate-90" />
                    </div>
                </div>
            </div>

            <!-- Task Detail View -->
            <div v-else class="space-y-4">
                <div v-if="loadingTaskDetail" class="flex justify-center py-10">
                    <Loader2 class="animate-spin text-primary" :size="32" />
                </div>

                <div v-else>
                    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</div>
                                <div class="text-sm font-medium text-gray-900 capitalize">{{ selectedTask.type }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                                <span
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize"
                                    :class="getStatusStyles(selectedTask.status).badgeClass">
                                    {{ selectedTask.status }}
                                </span>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Started</div>
                                <div class="text-sm text-gray-700">{{ formatDate(selectedTask.started_at) }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Finished</div>
                                <div class="text-sm text-gray-700">{{ formatDate(selectedTask.finished_at) }}</div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-3">
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Task ID</div>
                                <div class="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded">{{
                                    selectedTask.taskId
                                }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Celery Task ID</div>
                                <div class="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded">{{
                                    selectedTask.celeryTaskId }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Created At</div>
                                <div class="text-sm text-gray-700">{{ formatDate(selectedTask.created_at) }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Logs — same simple ``<pre>`` rendering as the
                         Terraform State and Outputs blocks below. The
                         previous formatted/raw toggle plus numbered
                         entry cards added a lot of UI surface for
                         little extra information; pretty-printed JSON
                         is uniform and lets the browser handle search
                         (Cmd+F) consistently across all three blocks. -->
                    <div v-if="selectedTask.logs" class="mb-4">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div
                                class="bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="p-1.5 bg-white rounded-md border border-emerald-200">
                                        <Terminal :size="16" class="text-emerald-600" />
                                    </div>
                                    <span class="font-semibold text-gray-900">Logs</span>
                                    <span v-if="logEntryCount !== null"
                                        class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded border border-emerald-200">
                                        {{ logEntryCount }} entries
                                    </span>
                                </div>
                                <button @click="copyToClipboard(prettyJson(selectedTask.logs), 'logs')"
                                    :title="copiedKey === 'logs' ? 'Copied!' : 'Copy to clipboard'"
                                    class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors"
                                    :class="copiedKey === 'logs'
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'">
                                    <component :is="copiedKey === 'logs' ? Check : Copy" :size="13" />
                                    {{ copiedKey === 'logs' ? 'Copied' : 'Copy' }}
                                </button>
                            </div>
                            <div class="bg-gray-50 p-4 overflow-y-auto max-h-[500px]">
                                <div class="bg-white rounded-lg border border-gray-200 p-4">
                                    <!-- Failure case: for a backend-formatted
                                         ``Task failed: ...`` string, split the
                                         friendly headline (shown in red) from the
                                         technical trace, which hides behind a toggle. -->
                                    <template v-if="taskLogsSplit.isFailure">
                                        <div class="flex items-start gap-2 text-sm text-red-700 mb-3">
                                            <AlertCircle :size="18" class="mt-0.5 flex-shrink-0" />
                                            <div class="font-medium leading-relaxed whitespace-pre-wrap">{{ taskLogsSplit.headline }}</div>
                                        </div>
                                        <button
                                            v-if="taskLogsSplit.details"
                                            type="button"
                                            class="text-xs text-gray-600 hover:text-gray-900 underline mb-2"
                                            @click="showTaskLogsTrace = !showTaskLogsTrace"
                                        >
                                            {{ showTaskLogsTrace ? 'Technische Details ausblenden' : 'Technische Details anzeigen' }}
                                        </button>
                                        <pre
                                            v-if="showTaskLogsTrace && taskLogsSplit.details"
                                            class="text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                                        >{{ taskLogsSplit.details }}</pre>
                                    </template>
                                    <pre v-else class="text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap" v-html="highlightJson(prettyJson(selectedTask.logs))"></pre>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="mb-4">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <div class="flex items-center gap-2">
                                    <Terminal :size="16" class="text-gray-400" />
                                    <span class="font-semibold text-gray-700">Logs</span>
                                </div>
                            </div>
                            <div class="text-center py-8 text-gray-500">
                                <Terminal :size="32" class="mx-auto mb-2 text-gray-300" />
                                <p class="text-sm">No logs available for this task</p>
                            </div>
                        </div>
                    </div>

                    <div v-if="activeDataTask?.tf_state" class="mb-4">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">

                            <div
                                class="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between select-none">
                                <div class="flex items-center gap-2">
                                    <div class="p-1.5 bg-white rounded-md border border-blue-200">
                                        <Settings :size="16" class="text-blue-600" />
                                    </div>
                                    <div class="flex flex-col text-left">
                                        <span class="font-semibold text-gray-900">{{
                                            $t('DeploymentDetailView.terraformState')
                                            }}</span>
                                        <span class="text-xs text-gray-500">
                                            {{ tfResourcesCount > 0 ? `${tfResourcesCount} verwaltete Ressourcen` :
                                                'Erweiterte Details' }}
                                        </span>
                                    </div>
                                </div>

                                <button @click="copyToClipboard(prettyJson(activeDataTask?.tf_state), 'tf_state')"
                                    :title="copiedKey === 'tf_state' ? 'Kopiert!' : 'In die Zwischenablage kopieren'"
                                    class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex-shrink-0"
                                    :class="copiedKey === 'tf_state'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'">
                                    <component :is="copiedKey === 'tf_state' ? Check : Copy" :size="13" />
                                    {{ copiedKey === 'tf_state' ? 'Copied' : 'Copy' }}
                                </button>
                            </div>

                            <div class="bg-white p-4 overflow-y-auto max-h-[500px]">
                                <div
                                    class="font-mono text-xs leading-relaxed text-left whitespace-pre-wrap select-text">
                                    <pre v-html="highlightJson(prettyJson(activeDataTask.tf_state))"></pre>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>

            </div>
            <!--
                VM detail sidebar — sticky right column, rendered only when the
                user opened a VM. Stays in view while scrolling the main content
                and is clamped to the viewport height. Below ``xl`` it falls into
                the page flow as a normal-width card.
            -->
            <aside
                v-if="openDrawerAddress"
                class="w-full xl:w-[420px] xl:shrink-0 xl:sticky xl:top-0 xl:self-start xl:max-h-[calc(100vh-3.5rem)] xl:flex xl:flex-col"
            >
                <InfrastructureVmDrawer
                    :deployment-id="deploymentId"
                    :address="openDrawerAddress"
                    class="xl:flex-1 xl:min-h-0"
                    @close="closeVmDrawer"
                />
            </aside>
        </div>

        <!-- Delete Confirmation Modal -->
        <DeploymentDeleteModal
            :show="showDeleteModal"
            :deployment-name="deployment.name"
            @close="showDeleteModal = false"
            @confirm="confirmDelete"
        />

        <!-- Redeploy Confirmation Modal — same shape as Delete: a
             yellow Cancel and a red Confirm. We surface the VM
             address in the body so the user can sanity-check which
             instance they're about to recreate. The Modal is the
             single source of truth; we never fall back to
             ``window.confirm``. -->
        <DeploymentRedeployModal
            :show="showRedeployModal"
            :address="redeployTargetAddress"
            @close="showRedeployModal = false"
            @confirm="confirmRedeploy"
        />

        <!-- Pause / Resume confirm. Same pattern as Delete: a tiny
             modal that asks the user to confirm before we POST. The
             title/body switch on ``pauseResumeAction`` so we don't
             render two near-identical modals. -->
        <DeploymentPauseResumeModal
            :show="showPauseResumeModal"
            :action="pauseResumeAction"
            :deployment-name="deployment.name"
            :busy="pauseResumeBusy"
            @close="showPauseResumeModal = false"
            @confirm="confirmPauseResume"
        />
    </div>

    <!-- Loading State -->
    <div v-else class="flex items-center justify-center py-20">
        <Loader2 class="animate-spin text-primary" :size="40" />
    </div>
</template>