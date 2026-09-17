import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const deploymentApi = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}))
vi.mock('@/api/deployment.api', () => ({ deploymentApi }))
vi.mock('@/api/app.api', () => ({ appApi: {} }))
vi.mock('../auth.store', () => ({ useAuthStore: () => ({ userId: 'u-1' }) }))

import { useDeploymentStore } from '../deployment.store'

const httpError = (status: number, detail?: unknown) =>
  Object.assign(new Error('Request failed'), { response: { status, data: { detail } } })

describe('DeploymentStore request actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.values(deploymentApi).forEach((fn) => fn.mockReset())
  })

  it('fetchDeployments stores the list and swallows errors into state.error', async () => {
    const store = useDeploymentStore()
    deploymentApi.list.mockResolvedValueOnce({ data: [{ deploymentId: 'd-1' }] })
    await store.fetchDeployments()
    expect(store.deployments).toEqual([{ deploymentId: 'd-1' }])

    deploymentApi.list.mockRejectedValueOnce(httpError(500, 'Server error'))
    await expect(store.fetchDeployments()).resolves.toBeUndefined()
    expect(store.error).toBe('Server error')
    expect(store.isLoading).toBe(false)
  })

  it('fetchDeploymentById treats 404 as soft-deleted, other errors as error state', async () => {
    const store = useDeploymentStore()
    store.currentDeployment = { deploymentId: 'd-1' } as never

    deploymentApi.getById.mockRejectedValueOnce(httpError(404, 'gone'))
    await store.fetchDeploymentById('d-1')
    expect(store.currentDeployment).toBeNull()
    expect(store.error).toBeNull()

    deploymentApi.getById.mockRejectedValueOnce(httpError(502))
    await store.fetchDeploymentById('d-1')
    expect(store.error).toBe('Failed to fetch deployment')
  })

  it.each([
    ['createDeployment', 'create', 'Failed to create deployment'],
    ['deleteDeployment', 'delete', 'Failed to delete deployment'],
    ['pauseDeployment', 'pause', 'Failed to pause deployment'],
    ['resumeDeployment', 'resume', 'Failed to resume deployment'],
  ] as const)('%s records the error and re-throws', async (action, endpoint, fallback) => {
    const store = useDeploymentStore()
    const err = httpError(409)
    deploymentApi[endpoint].mockRejectedValueOnce(err)

    await expect((store[action] as (arg: never) => Promise<unknown>)('x' as never)).rejects.toBe(err)
    expect(store.error).toBe(fallback)
    expect(store.isLoading).toBe(false)
  })

  it('deleteDeployment returns the raw response and drops the row', async () => {
    const store = useDeploymentStore()
    store.deployments = [{ deploymentId: 'd-1' }, { deploymentId: 'd-2' }] as never
    const response = { status: 202 }
    deploymentApi.delete.mockResolvedValueOnce(response)

    await expect(store.deleteDeployment('d-1')).resolves.toBe(response)
    expect(store.deployments.map((d) => d.deploymentId)).toEqual(['d-2'])
  })
})
