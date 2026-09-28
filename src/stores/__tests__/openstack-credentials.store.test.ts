import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const credentialsApi = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  putFromYaml: vi.fn(),
  remove: vi.fn(),
  test: vi.fn(),
}))
vi.mock('@/api/credentials.api', () => ({ credentialsApi }))

import { useOpenStackCredentialsStore } from '../openstack-credentials.store'

const httpError = (status: number, detail?: unknown) =>
  Object.assign(new Error('Request failed'), { response: { status, data: { detail } } })

describe('OpenStack credentials store errors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(credentialsApi).forEach((fn) => fn.mockReset())
  })

  it('keeps the backend message of a failed save', async () => {
    const store = useOpenStackCredentialsStore()
    credentialsApi.put.mockRejectedValueOnce(httpError(422, 'auth_url is not a URL'))

    await expect(store.save({} as never)).rejects.toBeDefined()
    expect(store.error).toBe('auth_url is not a URL')
  })

  it('leaves the error empty when the backend sent only a machine code', async () => {
    const store = useOpenStackCredentialsStore()
    credentialsApi.test.mockRejectedValueOnce(httpError(502, { reason: 'openstack_unavailable' }))

    await expect(store.test()).rejects.toBeDefined()
    expect(store.error).toBeNull()
  })

  it('reloads the status when a save hits the lock', async () => {
    const store = useOpenStackCredentialsStore()
    credentialsApi.put.mockRejectedValueOnce(httpError(409, { reason: 'openstack_credentials_locked', active_deployments: 2 }))
    credentialsApi.get.mockResolvedValueOnce({ data: { has_credential: true, is_locked: true, active_deployments: 2 } })

    await expect(store.save({} as never)).rejects.toBeDefined()
    expect(credentialsApi.get).toHaveBeenCalledTimes(1)
    expect(store.isLocked).toBe(true)
  })
})
