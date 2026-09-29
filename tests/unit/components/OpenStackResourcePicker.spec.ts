import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import OpenStackResourcePicker from '@/components/OpenStackResourcePicker.vue'
import { openstackResourcesApi } from '@/api/openstack-resources.api'
import { getDisplayName, invalidate, prime } from '@/composables/useOpenStackResourceCache'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}))

const toastSuccess = vi.fn()
const toastWarning = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: toastSuccess, warning: toastWarning, error: vi.fn() }),
}))

vi.mock('@/api/openstack-resources.api', () => ({
  openstackResourcesApi: {
    listNetworks: vi.fn(),
    listSubnets: vi.fn(),
    listFlavors: vi.fn(),
    listImages: vi.fn(),
    listKeypairs: vi.fn(),
    listSecurityGroups: vi.fn(),
    listFloatingIpPools: vi.fn(),
    listVolumes: vi.fn(),
    listRouters: vi.fn(),
    listAvailabilityZones: vi.fn(),
    refresh: vi.fn(),
  },
}))

vi.mock('@/composables/useOpenStackResourceCache', () => ({
  prime: vi.fn(),
  invalidate: vi.fn(),
  getDisplayName: vi.fn(() => undefined),
  ensureLoaded: vi.fn(),
}))

const flavors = [
  { id: 'f-1', name: 'm1.small', vcpus: 1, ram: 2048, disk: 20, is_public: true },
  { id: 'f-2', name: 'm1.large', vcpus: 4, ram: 1536, disk: 80, is_public: false },
]

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(OpenStackResourcePicker, {
    props: { osType: 'flavor', ...props },
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  })
}

async function open(wrapper: ReturnType<typeof mountPicker>) {
  await wrapper.find('button').trigger('click')
  await flushPromises()
}

const rows = (wrapper: ReturnType<typeof mountPicker>) => wrapper.findAll('li')
const lastEmit = (wrapper: ReturnType<typeof mountPicker>) => {
  const events = wrapper.emitted('update:modelValue') ?? []
  return events[events.length - 1]?.[0]
}

describe('OpenStackResourcePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(openstackResourcesApi.listFlavors).mockResolvedValue({ data: flavors } as any)
    vi.mocked(openstackResourcesApi.refresh).mockResolvedValue({} as any)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('loads the list for its type and primes the shared cache', async () => {
    mountPicker()
    await flushPromises()
    expect(openstackResourcesApi.listFlavors).toHaveBeenCalledTimes(1)
    expect(prime).toHaveBeenCalledWith('flavor', flavors)
  })

  it('shows each flavor with its spec line and marks private ones', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await open(wrapper)

    expect(rows(wrapper)).toHaveLength(2)
    expect(rows(wrapper)[0]!.text()).toContain('1 vCPU · 2 GB RAM · 20 GB Disk')
    expect(rows(wrapper)[1]!.text()).toContain('4 vCPU · 1.5 GB RAM · 80 GB Disk')
    expect(rows(wrapper)[1]!.text()).toContain('openstackPicker.network.private')
  })

  it('selects by name in name mode and closes the list', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await open(wrapper)

    await rows(wrapper)[1]!.trigger('click')
    expect(lastEmit(wrapper)).toBe('m1.large')
    expect(rows(wrapper)).toHaveLength(0)
  })

  it('selects by id in id mode and clears a selection clicked again', async () => {
    const wrapper = mountPicker({ osMode: 'id', modelValue: 'f-1' })
    await flushPromises()
    await open(wrapper)

    await rows(wrapper)[0]!.trigger('click')
    expect(lastEmit(wrapper)).toBe('')
  })

  it('lists the selected entries first', async () => {
    const wrapper = mountPicker({ modelValue: 'm1.large' })
    await flushPromises()
    await open(wrapper)
    expect(rows(wrapper)[0]!.text()).toContain('m1.large')
  })

  it('filters by name, id and spec line', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await open(wrapper)

    await wrapper.find('input').setValue('4 vcpu')
    expect(rows(wrapper)).toHaveLength(1)
    expect(rows(wrapper)[0]!.text()).toContain('m1.large')
  })

  describe('multi select', () => {
    it('turns a comma-separated value into an array on mount', async () => {
      const wrapper = mountPicker({ multi: true, modelValue: 'm1.small, m1.large' })
      expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['m1.small', 'm1.large'])
    })

    it('adds to and removes from the selection as an array', async () => {
      const wrapper = mountPicker({ multi: true, modelValue: ['m1.small'] })
      await flushPromises()
      await open(wrapper)

      await rows(wrapper)[1]!.trigger('click')
      expect(lastEmit(wrapper)).toEqual(['m1.small', 'm1.large'])
      // The list stays open for further picks.
      expect(rows(wrapper)).toHaveLength(2)
    })

    it('removes a chip', async () => {
      const wrapper = mountPicker({ multi: true, modelValue: ['m1.small', 'm1.large'] })
      await flushPromises()

      const chip = wrapper.findAll('span[title]').find((s) => s.attributes('title') === 'm1.large')!
      await chip.find('button').trigger('click')
      expect(lastEmit(wrapper)).toEqual(['m1.small'])
    })
  })

  it('shows a value it does not know with the external badge', async () => {
    const wrapper = mountPicker({ modelValue: 'gone-flavor' })
    await flushPromises()
    expect(wrapper.text()).toContain('gone-flavor')
    expect(wrapper.text()).toContain('openstackPicker.externalBadge')
    expect(getDisplayName).toHaveBeenCalledWith('flavor', 'name', 'gone-flavor')
  })

  it('shows only a compact hint when credentials are missing (412)', async () => {
    vi.mocked(openstackResourcesApi.listFlavors).mockRejectedValue({ response: { status: 412 } })
    const wrapper = mountPicker({ allowFreeText: true })
    await flushPromises()

    expect(wrapper.text()).toContain('openstackPicker.credentialsRequired')
    expect(wrapper.text()).toContain('openstackPicker.enterManuallyInstead')
  })

  it('offers retry and free text when OpenStack is down (502)', async () => {
    vi.mocked(openstackResourcesApi.listFlavors).mockRejectedValue({
      response: { status: 502, data: { detail: 'Keystone down' } },
    })
    const wrapper = mountPicker({ allowFreeText: true })
    await flushPromises()
    await open(wrapper)

    expect(wrapper.text()).toContain('openstackPicker.unreachable')
    expect(wrapper.text()).toContain('Keystone down')
    expect(wrapper.text()).toContain('openstackPicker.retry')
    expect(wrapper.text()).toContain('openstackPicker.enterManually')
  })

  describe('free text', () => {
    const enterFreeText = async (props: Record<string, unknown>) => {
      const wrapper = mountPicker({ allowFreeText: true, ...props })
      await flushPromises()
      await open(wrapper)
      const button = wrapper.findAll('button').find((b) => b.text().includes('openstackPicker.enterManuallyShort'))!
      await button.trigger('click')
      return wrapper
    }

    it('emits the trimmed value in single mode', async () => {
      const wrapper = await enterFreeText({})
      await wrapper.find('input').setValue('  custom  ')
      expect(lastEmit(wrapper)).toBe('custom')
    })

    it('emits an array in multi mode and starts from the current value', async () => {
      const wrapper = await enterFreeText({ multi: true, modelValue: ['m1.small'] })
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('m1.small')

      await wrapper.find('input').setValue('a, b')
      expect(lastEmit(wrapper)).toEqual(['a', 'b'])
    })

    it('goes back to the list and reloads it', async () => {
      const wrapper = await enterFreeText({})
      await wrapper.findAll('button').find((b) => b.text().includes('openstackPicker.showList'))!.trigger('click')
      await flushPromises()
      expect(openstackResourcesApi.listFlavors).toHaveBeenCalledTimes(2)
    })
  })

  describe('refresh', () => {
    const refreshButton = (wrapper: ReturnType<typeof mountPicker>) =>
      wrapper.findAll('button').find((b) => b.attributes('title') === 'openstackPicker.refreshList')!

    it('refreshes the backend cache, reloads and confirms', async () => {
      const wrapper = mountPicker()
      await flushPromises()
      await refreshButton(wrapper).trigger('click')
      await flushPromises()

      expect(openstackResourcesApi.refresh).toHaveBeenCalledWith('flavor')
      expect(invalidate).toHaveBeenCalledWith('flavor')
      expect(openstackResourcesApi.listFlavors).toHaveBeenCalledTimes(2)
      expect(toastSuccess).toHaveBeenCalledWith('openstackPicker.toasts.listRefreshed')
    })

    it('warns when a selected entry is gone after the refresh', async () => {
      const wrapper = mountPicker({ modelValue: 'm1.large' })
      await flushPromises()
      vi.mocked(openstackResourcesApi.listFlavors).mockResolvedValue({ data: [flavors[0]] } as any)

      await refreshButton(wrapper).trigger('click')
      await flushPromises()

      expect(toastWarning).toHaveBeenCalledWith('openstackPicker.toasts.removed {"label":"m1.large"}')
    })
  })

  describe('subnets', () => {
    it('loads only the subnets of the given network, keeps them out of the shared cache and reloads when it changes', async () => {
      vi.mocked(openstackResourcesApi.listSubnets).mockResolvedValue({
        data: [{ id: 's-1', name: 'sub', cidr: '10.0.0.0/24', ip_version: 4, gateway_ip: '10.0.0.1' }],
      } as any)
      const wrapper = mountPicker({ osType: 'subnet', filterNetworkId: 'net-1' })
      await flushPromises()

      expect(openstackResourcesApi.listSubnets).toHaveBeenCalledWith('net-1')
      expect(prime).not.toHaveBeenCalled()

      await wrapper.setProps({ filterNetworkId: 'net-2' })
      await flushPromises()
      expect(openstackResourcesApi.listSubnets).toHaveBeenLastCalledWith('net-2')

      await open(wrapper)
      expect(rows(wrapper)[0]!.text()).toContain('10.0.0.0/24  IPv4')
    })
  })

  it('asks for active images and the compute availability zones by default', async () => {
    vi.mocked(openstackResourcesApi.listImages).mockResolvedValue({ data: [] } as any)
    vi.mocked(openstackResourcesApi.listAvailabilityZones).mockResolvedValue({ data: [] } as any)
    mountPicker({ osType: 'image' })
    mountPicker({ osType: 'availability_zone' })
    await flushPromises()

    expect(openstackResourcesApi.listImages).toHaveBeenCalledWith('active')
    expect(openstackResourcesApi.listAvailabilityZones).toHaveBeenCalledWith('compute')
  })
})
