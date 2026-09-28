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

describe('useDeploymentStream snapshot', () => {
  const sseBody = (...frames: string[]) =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const f of frames) controller.enqueue(new TextEncoder().encode(f + '\n\n'))
        controller.close()
      },
    })

  beforeEach(() => {
    vi.clearAllMocks()
    h.authorizationFor.mockResolvedValue('Bearer t')
  })

  afterEach(() => vi.unstubAllGlobals())

  it('adopts progress and phase from a live snapshot (upper-case status)', async () => {
    const snapshot = { task_id: 't1', status: 'RUNNING', current_phase: 'TERRAFORM_APPLY', progress_pct: 40, type: 'deploy' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, body: sseBody(`event: snapshot\ndata: ${JSON.stringify(snapshot)}`),
    }))

    const stream = useDeploymentStream(ref('d1'))
    stream.start()
    await flushPromises()

    expect(stream.progress.value).toBe(40)
    expect(stream.currentPhase.value).toBe('TERRAFORM_APPLY')
    expect(stream.totalPhases.value).toBe(11)
  })

  it('ignores a finished task in the snapshot and ends the stream', async () => {
    const snapshot = { task_id: 't1', status: 'SUCCESS', current_phase: 'OUTPUTS', progress_pct: 100, type: 'deploy' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, body: sseBody(`event: snapshot\ndata: ${JSON.stringify(snapshot)}`),
    }))

    const stream = useDeploymentStream(ref('d1'))
    stream.start()
    await flushPromises()

    expect(stream.progress.value).toBeNull()
    expect(stream.connectionState.value).toBe('ended')
  })
})
