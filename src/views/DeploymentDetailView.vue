<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import EntityListState from '@/components/ui/EntityListState.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTE_NAMES } from '@/router/route-names'
import type { Task } from '@/types'
import InfrastructureVmDrawer from '@/components/InfrastructureVmDrawer.vue'
import DeploymentDetailHeader from '@/components/deployment/DeploymentDetailHeader.vue'
import DeploymentOverviewCards from '@/components/deployment/DeploymentOverviewCards.vue'
import DeploymentGroupsCard from '@/components/deployment/DeploymentGroupsCard.vue'
import DeploymentVariablesCard from '@/components/deployment/DeploymentVariablesCard.vue'
import DeploymentActiveTaskCard from '@/components/deployment/DeploymentActiveTaskCard.vue'
import DeploymentTeamsCard from '@/components/deployment/DeploymentTeamsCard.vue'
import DeploymentInfrastructureSection from '@/components/deployment/DeploymentInfrastructureSection.vue'
import DeploymentTaskHistory from '@/components/deployment/DeploymentTaskHistory.vue'
import DeploymentDeleteModal from '@/components/deployment/DeploymentDeleteModal.vue'
import DeploymentRedeployModal from '@/components/deployment/DeploymentRedeployModal.vue'
import DeploymentPauseResumeModal from '@/components/deployment/DeploymentPauseResumeModal.vue'
import { provideCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useDeploymentOwnerView } from '@/composables/useDeploymentOwnerView'
import { useBreadcrumbEntity } from '@/composables/useBreadcrumbs'
import { useDeploymentTasks } from '@/composables/useDeploymentTasks'
import { useDeploymentLiveStream } from '@/composables/useDeploymentLiveStream'
import { useDeploymentCredentials } from '@/composables/useDeploymentCredentials'
import { useDeploymentResources } from '@/composables/useDeploymentResources'
import { useDeploymentLifecycle } from '@/composables/useDeploymentLifecycle'
import { useResendAccess } from '@/composables/useResendAccess'
import { selectHistoryTasks } from '@/services/deployment-tasks.service'
import { parseDeploymentGroups, parseDeploymentVariables } from '@/services/deployment-input.service'

const route = useRoute()
const deploymentStore = useDeploymentStore()
const authStore = useAuthStore()

const deploymentId = route.params.id as string

// Only the deployment of this page: the store may still hold the one of a
// previously opened detail page until this page's fetch has finished.
const deployment = computed(() => {
    const current = deploymentStore.currentDeployment
    return current?.deploymentId === deploymentId ? current : null
})

useBreadcrumbEntity(() => deployment.value?.name)

// True when the initial load found no deployment (not found, server or
// network error); the page then shows an error instead of the spinner.
const loadFailed = ref(false)

// Owner-view vs member-view — gates tasks/logs, lifecycle actions, the
// live stream and other members' resend buttons (see ``useDeploymentOwnerView``).
const { isOwnerView, canOperate } = useDeploymentOwnerView(deployment)

// Task list, active task, opened task detail and the newest task's
// outputs (see ``useDeploymentTasks``).
const {
    tasks,
    loadingTasks,
    activeTask,
    selectedTask,
    loadingTaskDetail,
    latestTaskOutputs,
    activeDataTask,
    loadTasks,
    loadLatestTaskOutputs,
    selectTask,
    deselectTask,
} = useDeploymentTasks(deploymentId, isOwnerView)

// Teams with each member's access credentials: owners read them from the
// newest task's outputs, members from ``/my-access``
// (see ``useDeploymentCredentials``).
const { enrichedTeams, loadMyAccess } = useDeploymentCredentials(deploymentId, deployment, latestTaskOutputs)

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
    drawerDetail,
    drawerLoading,
    drawerError,
    loadDrawerDetail,
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
    if (!deployment.value) {
        loadFailed.value = true
        return
    }
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
// ``live`` is a reactive object, so the card reads plain values from it;
// the refs used elsewhere in this script are destructured.
const {
    connectionState: streamConnectionState,
    isStreamRelevant,
    live,
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
    deleteBusy,
    showPauseResumeModal,
    pauseResumeBusy,
    confirmDelete,
    confirmPauseResume,
} = useDeploymentLifecycle({
    deploymentId,
    deployment,
    canOperate,
    tasks,
    activeTask,
    connectionState: streamConnectionState,
    loadTasks,
})

// Copy-to-clipboard state, shared page-wide: only one button can be the
// "just copied" target at a time. Provided to the child components
// (Teams card, task detail) via ``provideCopyToClipboard``.
provideCopyToClipboard()

// Groups and variables from the persisted wizard input
// (see ``services/deployment-input.service``).
const groups = computed(() => parseDeploymentGroups(deployment.value?.userInputVar))

const deploymentVariables = computed(() => parseDeploymentVariables(deployment.value?.userInputVar))

// Resend-access buttons: per-user send state and the busy gate
// (see ``useResendAccess``).
const { isDeploymentBusy, resendState, resendAccess } = useResendAccess({
    deploymentId,
    deployment,
    activeTask,
})
</script>

<template>
    <div v-if="deployment" :class="openDrawerAddress ? 'max-w-page' : 'max-w-detail'">
        <!--
            Two-column layout: the deployment detail content stays on the left,
            and the VM-detail sidebar anchors as a sticky right column when an
            inline VM is selected. The left column expands to full width otherwise.
        -->
        <div class="flex flex-col items-start gap-section xl:flex-row">
            <div class="w-full min-w-0 flex-1">

        <!-- Header with name, status and the lifecycle actions -->
        <DeploymentDetailHeader
            :deployment="deployment"
            :can-operate="canOperate"
            :can-delete="canDelete"
            :delete-disabled-reason="deleteDisabledReason"
            :can-pause-or-resume="canPauseOrResume"
            :pause-resume-action="pauseResumeAction"
            :pause-resume-busy="pauseResumeBusy"
            @delete="showDeleteModal = true"
            @pause-resume="showPauseResumeModal = true"
        />

        <div class="flex flex-col gap-section">

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
            :live="live"
        />

        <!-- Teams & Members section — appears above Infrastructure so
             the human-readable view (who has access to what) precedes
             the technical resource listing. -->
        <DeploymentTeamsCard
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
             ``bg-panel rounded-xl border ... p-6 shadow-sm`` shell,
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
            :can-redeploy="canOperate"
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
        <DeploymentTaskHistory
            :is-owner-view="isOwnerView"
            :is-stream-relevant="isStreamRelevant"
            :history-tasks="historyTasks"
            :loading-tasks="loadingTasks"
            :selected-task="selectedTask"
            :loading-task-detail="loadingTaskDetail"
            :active-data-task="activeDataTask"
            @select="selectTask"
            @deselect="deselectTask"
        />

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
                    :address="openDrawerAddress"
                    :detail="drawerDetail"
                    :is-loading="drawerLoading"
                    :error-message="drawerError"
                    class="xl:flex-1 xl:min-h-0"
                    @close="closeVmDrawer"
                    @reload="loadDrawerDetail"
                />
            </aside>
        </div>

        <!-- Delete Confirmation Modal -->
        <DeploymentDeleteModal
            :show="showDeleteModal"
            :deployment-name="deployment.name"
            :busy="deleteBusy"
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

    <!-- Still loading, or the deployment could not be loaded -->
    <EntityListState
        v-else
        :is-loading="!loadFailed"
        :is-error="loadFailed"
        :error-message="$t('DeploymentDetailView.loadError')"
    >
        <template #error-action>
            <RouterLink :to="{ name: ROUTE_NAMES.deploymentsList }" class="text-sm font-medium text-accent-fg hover:underline">
                {{ $t('DeploymentDetailView.backToList') }}
            </RouterLink>
        </template>
    </EntityListState>
</template>