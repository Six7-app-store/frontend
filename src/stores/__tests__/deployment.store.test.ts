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

  describe('submitDraft payload', () => {
    const submit = async (draft: Record<string, unknown>) => {
      const store = useDeploymentStore()
      Object.assign(store.draft, { appId: 'app-1', name: 'Lab', ...draft })
      deploymentApi.create.mockResolvedValueOnce({ data: { deploymentId: 'd-new' } })
      await store.submitDraft()
      return deploymentApi.create.mock.calls[0]![0]
    }

    it('refuses a draft without app or name', async () => {
      const store = useDeploymentStore()
      await expect(store.submitDraft()).rejects.toThrow()
      expect(deploymentApi.create).not.toHaveBeenCalled()
    })

    it.each([
      ['v1.2.0', 'v1.2.0'],
      ['', 'latest'],
      [{ version: 'v2', name: 'x' }, 'v2'],
      [{ name: 'v3' }, 'v3'],
    ])('sends release tag %j as %s', async (releaseTag, expected) => {
      const payload = await submit({ releaseTag })
      expect(payload.releaseTag).toBe(expected)
    })

    it('sends the named teams with their assignments', async () => {
      const payload = await submit({
        studentIds: ['u1', 'u2', 'u3'],
        groupNames: ['Rot', 'Blau'],
        assignments: [['u1', 'u3'], ['u2']],
      })
      expect(payload.teams).toEqual([
        { name: 'Rot', userIds: ['u1', 'u3'] },
        { name: 'Blau', userIds: ['u2'] },
      ])
    })

    it('splits the students evenly into Team-n when no teams are named', async () => {
      const payload = await submit({
        studentIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
        groupNames: [],
        groupCount: 2,
      })
      expect(payload.teams).toEqual([
        { name: 'Team-1', userIds: ['u1', 'u2', 'u3'] },
        { name: 'Team-2', userIds: ['u4', 'u5'] },
      ])
    })

    it('sorts values into packer and terraform and skips empty ones', async () => {
      const payload = await submit({
        variableDefinitions: [
          { name: 'region', source: 'packer' },
          { name: 'flavor', source: 'terraform' },
          { name: 'empty', source: 'terraform' },
          { name: 'upload', source: 'terraform', osType: 'file' },
        ],
        variables: { region: 'eu', flavor: 'm1', empty: '  ', upload: {} },
      })
      expect(payload.userInputVar).toEqual({ packer: { region: 'eu' }, terraform: { flavor: 'm1' } })
      expect(payload).not.toHaveProperty('files')
    })

    it('nests packer values per template in the multi-image layout', async () => {
      const payload = await submit({
        variableDefinitions: [
          { name: 'size', source: 'packer', template_key: 'web' },
          { name: 'size', source: 'packer', template_key: 'db' },
        ],
        variables: { packer: { web: { size: 's' }, db: { size: 'l' } } },
      })
      expect(payload.userInputVar.packer).toEqual({ web: { size: 's' }, db: { size: 'l' } })
    })

    it('sends only filled file slots', async () => {
      const file = { name: 'a.txt', size: 1, content_b64: 'YQ==' }
      const payload = await submit({
        fileUploads: { keys: { all: file }, unused: { all: null } },
      })
      expect(payload.files).toEqual({ keys: { all: file } })
    })
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
