import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

const h = vi.hoisted(() => ({
  authorizationFor: vi.fn(),
  handleUnauthorized: vi.fn(),
}))

vi.mock('@/api/axios', () => ({
  default: {},
  authorizationFor: h.authorizationFor,
  handleUnauthorized: h.handleUnauthorized,
}))

vi.mock('@/env', () => ({ env: { API_URL: 'http://api' } }))

import { useDeploymentStream } from '@/composables/useDeploymentStream'

describe('useDeploymentStream authentication', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the token the API client picks, e.g. the LTI session token', async () => {
    h.authorizationFor.mockResolvedValue('Bearer lti-token')
    fetchMock.mockResolvedValue({ ok: false, status: 404, body: null })

    const stream = useDeploymentStream(ref('d1'))
    stream.start()
    await flushPromises()

    expect(h.authorizationFor).toHaveBeenCalledWith('/deployments/d1/stream')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://api/deployments/d1/stream')
    expect(init.headers.Authorization).toBe('Bearer lti-token')
    stream.stop()
  })

  it('sends no Authorization header instead of an empty one without a token', async () => {
    h.authorizationFor.mockResolvedValue(null)
    fetchMock.mockResolvedValue({ ok: false, status: 404, body: null })

    const stream = useDeploymentStream(ref('d1'))
    stream.start()
    await flushPromises()

    expect(fetchMock.mock.calls[0]![1].headers).not.toHaveProperty('Authorization')
    stream.stop()
  })

  it('hands a 401 to the shared handler and does not reconnect', async () => {
    h.authorizationFor.mockResolvedValue('Bearer expired')
    fetchMock.mockResolvedValue({ ok: false, status: 401, body: null })

    const stream = useDeploymentStream(ref('d1'))
    stream.start()
    await flushPromises()

    expect(h.handleUnauthorized).toHaveBeenCalledTimes(1)
    expect(stream.connectionState.value).toBe('error')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
