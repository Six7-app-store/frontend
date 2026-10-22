import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { deploymentApi } from '@/api/deployment.api'
import { useToast } from '@/composables/useToast'
import { getErrorDetailMessage, getErrorReason, getErrorStatus, openStackFailure } from '@/utils/http-error'
import type { DeploymentResource } from '@/types'

export interface DeploymentResourcesOptions {
  deploymentId: string
  isOwnerView: Ref<boolean>
  /**
   * Called once a redeploy or reboot task was dispatched — the place to
   * refresh the task list so the new task drives the live-progress card.
   */
  onRedeployStarted: () => Promise<unknown> | void
}

/** Per-VM action: ``redeploy`` recreates the VM (UI: "Zurücksetzen"),
 *  ``reboot`` hard-reboots it and keeps disk and IPs (UI: "Neustart"). */
export type VmAction = 'redeploy' | 'reboot'

/**
 * INFRASTRUCTURE TAB of the deployment detail page — Stage-1 list +
 * Stage-2 drawer + per-VM redeploy and reboot.
 *
 * State for the resource panel sits on the page (not in a Pinia
 * store) because it's strictly per-deployment and we want it to
 * reset on navigation. The list refreshes once when a task
 * transitions to success/failed (the caller triggers that); the
 * drawer fetches lazy.
 *
 * Resources are owner-only; for members :func:`loadResources` is a no-op.
 */
export function useDeploymentResources(options: DeploymentResourcesOptions) {
  const { deploymentId, isOwnerView, onRedeployStarted } = options
  const { t } = useI18n()
  const toast = useToast()

  const resources = ref<DeploymentResource[]>([])
  const resourcesLoading = ref(false)
  const resourcesError = ref<string | null>(null)
  // Addresses currently waiting on a redeploy task. Used both to
  // disable the button on the card and to know we should refetch the
  // list as soon as the task finishes.
  const redeployInFlight = ref<Set<string>>(new Set())
  // Address of the VM whose detail drawer is currently open. ``null``
  // means the drawer is closed. Its Stage-2 detail loads whenever the
  // address changes.
  const openDrawerAddress = ref<string | null>(null)
  const drawerDetail = ref<DeploymentResource | null>(null)
  const drawerLoading = ref(false)
  const drawerError = ref<string | null>(null)
  // Per-VM redeploy confirmation. Mirrors the Delete-modal pattern, but
  // the action targets a single resource (identified by its TF state
  // address), so we also remember which VM the user clicked while the
  // modal is open.
  const showRedeployModal = ref(false)
  const redeployTargetAddress = ref<string | null>(null)
  // Same pair for the per-VM reboot.
  const rebootInFlight = ref<Set<string>>(new Set())
  const showRebootModal = ref(false)
  const rebootTargetAddress = ref<string | null>(null)

  // Per-action wiring of the shared confirm → dispatch flow below.
  const vmActions = {
    redeploy: {
      inFlight: redeployInFlight,
      showModal: showRedeployModal,
      target: redeployTargetAddress,
      dispatch: (address: string) => deploymentApi.redeployResource(deploymentId, address),
      startedKey: 'DeploymentDetailView.redeployStarted',
      errorKey: 'DeploymentDetailView.redeployError',
    },
    reboot: {
      inFlight: rebootInFlight,
      showModal: showRebootModal,
      target: rebootTargetAddress,
      dispatch: (address: string) => deploymentApi.rebootResource(deploymentId, address),
      startedKey: 'DeploymentDetailView.rebootStarted',
      errorKey: 'DeploymentDetailView.rebootError',
    },
  } as const

  const loadResources = async (refresh = true) => {
    if (!isOwnerView.value) return
    resourcesLoading.value = true
    resourcesError.value = null
    try {
      const response = await deploymentApi.listResources(deploymentId, { refresh })
      resources.value = response.data.resources
    } catch (err) {
      const failure = openStackFailure(err)
      if (failure === 'credentials_missing') {
        resourcesError.value = t('vm.resourcesErrors.missingCredentials')
      } else if (failure === 'unavailable') {
        resourcesError.value = t('vm.resourcesErrors.unreachable')
      } else if (failure === 'not_found') {
        // Deployment was soft-deleted upstream (e.g. right after a
        // successful destroy). The resources are gone; the stream watcher
        // handles the ``gone`` path, so just clear silently here.
        resources.value = []
      } else {
        resourcesError.value = t('vm.resourcesErrors.generic')
      }
    } finally {
      resourcesLoading.value = false
    }
  }

  /**
   * Loads the Stage-2 detail of the open VM. Not found (removed since the
   * list was rendered) and missing credentials (lost between mount and
   * click) are shown inline in the drawer like the other failures; the
   * page-level toast is kept for harder errors. A response for a VM that
   * is no longer the open one is dropped.
   */
  const loadDrawerDetail = async () => {
    const address = openDrawerAddress.value
    if (!address) return
    drawerLoading.value = true
    drawerError.value = null
    try {
      const response = await deploymentApi.getResourceDetail(deploymentId, address)
      if (openDrawerAddress.value === address) drawerDetail.value = response.data
    } catch (err) {
      if (openDrawerAddress.value !== address) return
      const messageKey = {
        not_found: 'vm.drawer.errors.notFound',
        credentials_missing: 'vm.drawer.errors.missingCredentials',
        unavailable: 'vm.drawer.errors.unreachable',
        other: 'vm.drawer.errors.generic',
      }[openStackFailure(err)]
      drawerError.value = t(messageKey)
    } finally {
      drawerLoading.value = false
    }
  }

  // Switching VMs keeps the old detail visible until the new one is there;
  // closing forgets it, so reopening starts from the loading state.
  watch(openDrawerAddress, (address) => {
    if (address) {
      loadDrawerDetail()
    } else {
      drawerDetail.value = null
      drawerError.value = null
    }
  })

  // Separate compute groups for the three sub-sections.
  const vmResources = computed(() => resources.value.filter(r => r.category === 'instance'))
  const networkResources = computed(() => resources.value.filter(
    r => r.category === 'network' || r.category === 'subnet' || r.category === 'floating_ip'
  ))
  const securityResources = computed(() => resources.value.filter(r => r.category === 'security_group'))

  // Click on the card's "Details" button toggles the inline panel:
  // open if a different card is currently shown (or none), close if the
  // same card is already expanded. Matches accordion semantics — only
  // one VM detail is visible at a time.
  const openVmDrawer = (address: string) => {
    if (openDrawerAddress.value === address) {
      openDrawerAddress.value = null
    } else {
      openDrawerAddress.value = address
    }
  }
  const closeVmDrawer = () => {
    openDrawerAddress.value = null
  }

  // Redeploy and reboot are a two-step UX: the VmCard's button emits
  // ``@redeploy`` / ``@reboot`` with an address, which opens a
  // confirmation Modal (same pattern as Delete). The actual API call
  // lives in ``executeVmAction`` so the Modal's confirm button can call
  // it without re-doing the address-extraction. While either action
  // runs for a VM, neither can be started again for it.
  const isVmBusy = (address: string) =>
    redeployInFlight.value.has(address) || rebootInFlight.value.has(address)

  const requestVmAction = (action: VmAction, address: string) => {
    if (isVmBusy(address)) return
    vmActions[action].target.value = address
    vmActions[action].showModal.value = true
  }

  const executeVmAction = async (action: VmAction, address: string) => {
    const cfg = vmActions[action]
    cfg.inFlight.value.add(address)
    try {
      await cfg.dispatch(address)
      toast.success(t(cfg.startedKey, { address }))
      // Refresh the task list right away so the freshly-dispatched
      // REDEPLOY/REBOOT row shows up as the new ``activeTask``. That in
      // turn flips ``isStreamRelevant`` to true → the SSE stream
      // attaches → live progress + logs render under the page's
      // existing active-task card, identical to deploy/destroy.
      // Without this poll, the new task only becomes visible on
      // the next manual page reload.
      await onRedeployStarted()
    } catch (err) {
      cfg.inFlight.value.delete(address)
      const reason = getErrorReason(err)
      if (reason === 'non_redeployable_resource_type') {
        toast.error(t('DeploymentDetailView.redeployNotRedeployable'))
      } else if (reason === 'resource_not_in_state') {
        toast.error(t('DeploymentDetailView.redeployNotInState'))
      } else if (reason === 'resource_without_server_id') {
        toast.error(t('DeploymentDetailView.rebootNoServer'))
      } else if (getErrorStatus(err) === 409) {
        toast.error(t('DeploymentDetailView.lifecycleBusy'))
      } else {
        toast.error(getErrorDetailMessage(err) ?? t(cfg.errorKey))
      }
    }
  }

  // Confirmation handler — close the modal first (so the user gets
  // immediate visual feedback that their click registered) and then
  // dispatch the actual API call. ``executeVmAction`` owns its own
  // toast handling and adds/removes the in-flight marker.
  const confirmVmAction = async (action: VmAction) => {
    const cfg = vmActions[action]
    const address = cfg.target.value
    cfg.showModal.value = false
    if (!address) return
    try {
      await executeVmAction(action, address)
    } finally {
      cfg.target.value = null
    }
  }

  const redeployVm = (address: string) => requestVmAction('redeploy', address)
  const confirmRedeploy = () => confirmVmAction('redeploy')
  const rebootVm = (address: string) => requestVmAction('reboot', address)
  const confirmReboot = () => confirmVmAction('reboot')

  return {
    resources,
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
    rebootInFlight,
    showRebootModal,
    rebootTargetAddress,
    rebootVm,
    confirmReboot,
  }
}
