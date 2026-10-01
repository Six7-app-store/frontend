import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const deploymentApi = vi.hoisted(() => ({ listResources: vi.fn(), redeployResource: vi.fn() }))
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
    [httpError(500, undefined, 'Boom'), 'Boom'],
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
    expect(toasts()).toEqual([{ type: 'success', message: 'Redeploy gestartet für vm-1' }])

    // Already in flight → no second confirmation.
    api.showRedeployModal.value = false
    api.redeployVm('vm-1')
    expect(api.showRedeployModal.value).toBe(false)
  })

  it.each([
    [httpError(422, { reason: 'non_redeployable_resource_type' }), 'Nur Compute-Instanzen können einzeln redeployed werden.'],
    [httpError(422, { reason: 'resource_not_in_state' }), 'Diese Resource ist nicht mehr im aktuellen State.'],
    [httpError(409, 'busy'), 'Es läuft bereits eine Lifecycle-Aktion für dieses Deployment.'],
    [httpError(500, undefined, 'Boom'), 'Boom'],
    [httpError(500), 'Redeploy fehlgeschlagen.'],
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

  it('ignores a confirmation without target', async () => {
    const { api } = setup()
    api.showRedeployModal.value = true
    await api.confirmRedeploy()
    expect(api.showRedeployModal.value).toBe(false)
    expect(deploymentApi.redeployResource).not.toHaveBeenCalled()
  })
})
