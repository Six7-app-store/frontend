import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useUserSearch } from '@/composables/useUserSearch'
import { userApi } from '@/api/user.api'

vi.mock('@/api/user.api', () => ({
  userApi: { list: vi.fn(), search: vi.fn() },
}))

const initialUsers = [{ userId: 'u1', username: 'initial' }]
const found = [{ userId: 'u2', username: 'found' }]

function setup() {
  const scope = effectScope()
  const search = scope.run(() => useUserSearch({ searchLimit: 10, initialLimit: 100 }))!
  return { scope, search }
}

async function type(search: ReturnType<typeof useUserSearch>, value: string) {
  search.query.value = value
  await nextTick()
}

describe('useUserSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(userApi.list).mockResolvedValue({ data: initialUsers } as any)
    vi.mocked(userApi.search).mockResolvedValue({ data: found } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('loads the initial students with the given limit', async () => {
    const { search } = setup()
    await search.loadInitial()
    expect(userApi.list).toHaveBeenCalledWith({ role: 'student', limit: 100 })
    expect(search.results.value).toEqual(initialUsers)
  })

  it('searches only after the debounce and from two characters on', async () => {
    const { search } = setup()
    await type(search, 'a')
    vi.advanceTimersByTime(300)
    expect(userApi.search).not.toHaveBeenCalled()

    await type(search, 'ab')
    vi.advanceTimersByTime(299)
    expect(userApi.search).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(userApi.search).toHaveBeenCalledWith('ab', 10)
    expect(search.results.value).toEqual(found)
  })

  it('searches once for fast typing', async () => {
    const { search } = setup()
    await type(search, 'ab')
    await type(search, 'abc')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(userApi.search).toHaveBeenCalledTimes(1)
    expect(userApi.search).toHaveBeenCalledWith('abc', 10)
  })

  it('goes back to the initial list for an empty query', async () => {
    const { search } = setup()
    await search.loadInitial()
    await type(search, 'ab')
    vi.advanceTimersByTime(300)
    await flushPromises()

    await type(search, '  ')
    expect(search.results.value).toEqual(initialUsers)
  })

  it('empties the results and keeps the error of a failed search until the next query', async () => {
    const { search } = setup()
    const failure = new Error('offline')
    vi.mocked(userApi.search).mockRejectedValueOnce(failure)
    await type(search, 'ab')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(search.results.value).toEqual([])
    expect(search.error.value).toBe(failure)

    await type(search, 'abc')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(search.error.value).toBeNull()
  })

  it('drops a pending search when the scope ends', async () => {
    const { scope, search } = setup()
    await type(search, 'ab')
    scope.stop()
    vi.advanceTimersByTime(300)
    expect(userApi.search).not.toHaveBeenCalled()
  })
})
