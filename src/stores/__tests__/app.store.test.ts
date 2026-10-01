import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app.store'

vi.mock('@/api/app.api', () => ({
  appApi: {
    list: vi.fn(() => Promise.resolve({ data: [] })),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getVariables: vi.fn(),
  },
}))

vi.mock('../auth.store', () => ({
  useAuthStore: () => ({ userId: 'test-user-id' }),
}))

describe('AppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with empty state', () => {
    const store = useAppStore()
    expect(store.apps).toEqual([])
    expect(store.currentApp).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchApps sets apps from API', async () => {
    const { appApi } = await import('@/api/app.api')
    const mockApps = [{ appId: '1', name: 'Test App', userId: 'test-user-id' }]
    vi.mocked(appApi.list).mockResolvedValueOnce({ data: mockApps } as any)

    const store = useAppStore()
    await store.fetchApps()

    expect(store.apps).toEqual(mockApps)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchApps handles errors', async () => {
    const { appApi } = await import('@/api/app.api')
    vi.mocked(appApi.list).mockRejectedValueOnce({
      response: { data: { detail: 'Server error' } },
    })

    const store = useAppStore()
    await store.fetchApps()

    expect(store.apps).toEqual([])
    expect(store.error).toBe('Server error')
    expect(store.isLoading).toBe(false)
  })
})
