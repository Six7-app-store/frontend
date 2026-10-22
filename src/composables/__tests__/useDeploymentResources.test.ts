import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const deploymentApi = vi.hoisted(() => ({
  listResources: vi.fn(), redeployResource: vi.fn(), rebootResource: vi.fn(), getResourceDetail: vi.fn(),
}))
vi.mock('@/api/deployment.api', () => ({ deploymentApi }))

import { useDeploymentResources } from '@/composables/useDeploymentResources'
import { useToastStore } from '@/stores/toast.store'
import de from '@/i18n/locales/de'
import type { DeploymentResource } from '@/types'

const resource = (address: string, category: DeploymentResource['category']) =>
  ({ address, category }) as DeploymentResource

const httpError = (status: number, detail?: unknown, message = '') =>
  Object.assign(new Error(message), { response: { status, data: { detail } } })

const setup = (owner = true) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const onRedeployStarted = vi.fn()
  let api!: ReturnType<typeof useDeploymentResources>
  mount(defineComponent({
    setup() {
      api = useDeploymentResources({ deploymentId: 'dep-1', isOwnerView: ref(owner), onRedeployStarted })
      return () => null
    },
  }), {
    global: { plugins: [pinia, createI18n({ legacy: false, locale: 'de', messages: { de } })] },
  })
  const toasts = () => useToastStore().toasts.map(({ type, message }) => ({ type, message }))
  return { api, onRedeployStarted, toasts }
}

describe('useDeploymentResources', () => {
  beforeEach(() => {
    deploymentApi.listResources.mockReset()
    deploymentApi.redeployResource.mockReset()
    deploymentApi.rebootResource.mockReset()
  })

  it('loads and groups resources for owners', async () => {
    deploymentApi.listResources.mockResolvedValue({
      data: {
        resources: [
          resource('vm', 'instance'), resource('net', 'network'), resource('sub', 'subnet'),
          resource('fip', 'floating_ip'), resource('sg', 'security_group'), resource('port', 'port'),
        ],
      },
    })
    const { api } = setup()

    const pending = api.loadResources()
    expect(api.resourcesLoading.value).toBe(true)
    await pending

    expect(deploymentApi.listResources).toHaveBeenCalledWith('dep-1', { refresh: true })
    expect(api.vmResources.value.map((r) => r.address)).toEqual(['vm'])
    expect(api.networkResources.value.map((r) => r.address)).toEqual(['net', 'sub', 'fip'])
    expect(api.securityResources.value.map((r) => r.address)).toEqual(['sg'])
    expect(api.resourcesLoading.value).toBe(false)
  })

  it('does nothing for members', async () => {
    const { api } = setup(false)
    await api.loadResources()
    expect(deploymentApi.listResources).not.toHaveBeenCalled()
  })

  it.each([
    [httpError(412), de.vm.resourcesErrors.missingCredentials],
    [httpError(502), de.vm.resourcesErrors.unreachable],
    [httpError(500, undefined, 'Boom'), de.vm.resourcesErrors.generic],
    [httpError(500), de.vm.resourcesErrors.generic],
    [httpError(404), null],
  ])('maps load errors to messages (%#)', async (err, message) => {
    deploymentApi.listResources.mockRejectedValue(err)
    const { api } = setup()
    api.resources.value = [resource('old', 'instance')]

    await api.loadResources()

    expect(api.resourcesError.value).toBe(message)
    if (message === null) expect(api.resources.value).toEqual([])
  })

  it('toggles the VM drawer accordion-style', () => {
    const { api } = setup()
    api.openVmDrawer('a')
    expect(api.openDrawerAddress.value).toBe('a')
    api.openVmDrawer('b')
    expect(api.openDrawerAddress.value).toBe('b')
    api.openVmDrawer('b')
    expect(api.openDrawerAddress.value).toBeNull()
    api.openVmDrawer('a')
    api.closeVmDrawer()
    expect(api.openDrawerAddress.value).toBeNull()
  })

  it('confirms a redeploy, keeps the address in flight and refreshes tasks', async () => {
    deploymentApi.redeployResource.mockResolvedValue({})
    const { api, onRedeployStarted, toasts } = setup()

    api.redeployVm('vm-1')
    expect(api.showRedeployModal.value).toBe(true)
    expect(api.redeployTargetAddress.value).toBe('vm-1')

    await api.confirmRedeploy()

    expect(api.showRedeployModal.value).toBe(false)
    expect(api.redeployTargetAddress.value).toBeNull()
    expect(deploymentApi.redeployResource).toHaveBeenCalledWith('dep-1', 'vm-1')
    expect(api.redeployInFlight.value.has('vm-1')).toBe(true)
    expect(onRedeployStarted).toHaveBeenCalledTimes(1)
    expect(toasts()).toEqual([{ type: 'success', message: 'Zurücksetzen gestartet für vm-1' }])

    // Already in flight → no second confirmation.
    api.showRedeployModal.value = false
    api.redeployVm('vm-1')
    expect(api.showRedeployModal.value).toBe(false)
  })

  it.each([
    [httpError(422, { reason: 'non_redeployable_resource_type' }), 'Nur einzelne VMs können neu gestartet oder zurückgesetzt werden.'],
    [httpError(422, { reason: 'resource_not_in_state' }), 'Diese Resource ist nicht mehr im aktuellen State.'],
    [httpError(409, 'busy'), 'Es läuft bereits eine Lifecycle-Aktion für dieses Deployment.'],
    [httpError(500, undefined, 'Boom'), 'Zurücksetzen fehlgeschlagen.'],
    [httpError(500, 'Kontingent erschöpft'), 'Kontingent erschöpft'],
    [httpError(500), 'Zurücksetzen fehlgeschlagen.'],
  ])('reports redeploy errors and releases the address (%#)', async (err, message) => {
    deploymentApi.redeployResource.mockRejectedValue(err)
    const { api, onRedeployStarted, toasts } = setup()

    api.redeployVm('vm-1')
    await api.confirmRedeploy()
    await flushPromises()

    expect(toasts()).toEqual([{ type: 'error', message }])
    expect(api.redeployInFlight.value.has('vm-1')).toBe(false)
    expect(onRedeployStarted).not.toHaveBeenCalled()
  })

  it('confirms a reboot for just that VM and blocks both actions while it runs', async () => {
    deploymentApi.rebootResource.mockResolvedValue({})
    const { api, onRedeployStarted, toasts } = setup()

    api.rebootVm('vm-1')
    expect(api.showRebootModal.value).toBe(true)
    expect(api.showRedeployModal.value).toBe(false)
    expect(api.rebootTargetAddress.value).toBe('vm-1')

    await api.confirmReboot()

    expect(api.showRebootModal.value).toBe(false)
    expect(api.rebootTargetAddress.value).toBeNull()
    expect(deploymentApi.rebootResource).toHaveBeenCalledWith('dep-1', 'vm-1')
    expect(deploymentApi.redeployResource).not.toHaveBeenCalled()
    expect(api.rebootInFlight.value.has('vm-1')).toBe(true)
    expect(onRedeployStarted).toHaveBeenCalledTimes(1)
    expect(toasts()).toEqual([{ type: 'success', message: 'Neustart gestartet für vm-1' }])

    // Same VM busy → neither a second reboot nor a reset can be requested.
    api.rebootVm('vm-1')
    api.redeployVm('vm-1')
    expect(api.showRebootModal.value).toBe(false)
    expect(api.showRedeployModal.value).toBe(false)
    // Another VM stays untouched and can still be restarted.
    api.rebootVm('vm-2')
    expect(api.rebootTargetAddress.value).toBe('vm-2')
  })

  it.each([
    [httpError(422, { reason: 'resource_without_server_id' }), de.DeploymentDetailView.rebootNoServer],
    [httpError(500), 'Neustart fehlgeschlagen.'],
  ])('reports reboot errors and releases the address (%#)', async (err, message) => {
    deploymentApi.rebootResource.mockRejectedValue(err)
    const { api, onRedeployStarted, toasts } = setup()

    api.rebootVm('vm-1')
    await api.confirmReboot()
    await flushPromises()

    expect(toasts()).toEqual([{ type: 'error', message }])
    expect(api.rebootInFlight.value.has('vm-1')).toBe(false)
    expect(onRedeployStarted).not.toHaveBeenCalled()
  })

  it('ignores a confirmation without target', async () => {
    const { api } = setup()
    api.showRedeployModal.value = true
    await api.confirmRedeploy()
    expect(api.showRedeployModal.value).toBe(false)
    expect(deploymentApi.redeployResource).not.toHaveBeenCalled()
  })
  describe('VM drawer detail', () => {
    beforeEach(() => {
      deploymentApi.getResourceDetail.mockReset()
    })

    it('loads the detail of the VM that is opened', async () => {
      deploymentApi.getResourceDetail.mockResolvedValue({ data: resource('vm', 'instance') })
      const { api } = setup()

      api.openVmDrawer('vm')
      await flushPromises()

      expect(deploymentApi.getResourceDetail).toHaveBeenCalledWith('dep-1', 'vm')
      expect(api.drawerDetail.value?.address).toBe('vm')
      expect(api.drawerLoading.value).toBe(false)
      expect(api.drawerError.value).toBeNull()
    })

    it('shows a VM removed since the list was rendered as an inline error', async () => {
      deploymentApi.getResourceDetail.mockRejectedValue(httpError(404))
      const { api } = setup()

      api.openVmDrawer('vm')
      await flushPromises()

      expect(api.drawerError.value).toBe(de.vm.drawer.errors.notFound)
      expect(api.drawerDetail.value).toBeNull()
    })

    it('drops the answer for a VM that is no longer open', async () => {
      let resolveFirst!: (v: unknown) => void
      deploymentApi.getResourceDetail
        .mockReturnValueOnce(new Promise((r) => { resolveFirst = r }))
        .mockResolvedValueOnce({ data: resource('b', 'instance') })
      const { api } = setup()

      api.openVmDrawer('a')
      await flushPromises()
      api.openVmDrawer('b')
      await flushPromises()
      resolveFirst({ data: resource('a', 'instance') })
      await flushPromises()

      expect(api.drawerDetail.value?.address).toBe('b')
    })

    it('forgets the detail when the drawer closes', async () => {
      deploymentApi.getResourceDetail.mockResolvedValue({ data: resource('vm', 'instance') })
      const { api } = setup()
      api.openVmDrawer('vm')
      await flushPromises()

      api.closeVmDrawer()
      await flushPromises()

      expect(api.drawerDetail.value).toBeNull()
    })
  })
})
