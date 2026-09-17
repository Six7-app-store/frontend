import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = vi.hoisted(() => ({
  listFlavors: vi.fn(),
  listNetworks: vi.fn(),
}))
vi.mock('@/api/openstack-resources.api', () => ({ openstackResourcesApi: api }))

import {
  ensureLoaded,
  getDisplayName,
  invalidateAll,
} from '@/composables/useOpenStackResourceCache'

describe('useOpenStackResourceCache', () => {
  beforeEach(() => {
    invalidateAll()
    api.listFlavors.mockReset()
    api.listNetworks.mockReset()
  })

  it('fetches a type only once for parallel callers', async () => {
    let resolve!: (value: unknown) => void
    api.listFlavors.mockReturnValue(new Promise((r) => { resolve = r }))

    const calls = [ensureLoaded('flavor'), ensureLoaded('flavor'), ensureLoaded('flavor')]
    resolve({ data: [{ id: 'f-1', name: 'm1.small' }] })
    await Promise.all(calls)

    expect(api.listFlavors).toHaveBeenCalledTimes(1)
    expect(getDisplayName('flavor', 'id', 'f-1')).toEqual({ name: 'm1.small', known: true })
  })

  it('serves a loaded type from the cache', async () => {
    api.listNetworks.mockResolvedValue({ data: [{ id: 'n-1', name: 'lab-net' }] })

    await ensureLoaded('network')
    await ensureLoaded('network')

    expect(api.listNetworks).toHaveBeenCalledTimes(1)
  })
})
