import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  ltiToken: null as string | null,
  keycloakToken: 'kc-token' as string | null,
  clear: vi.fn(),
  ensureValidToken: vi.fn(),
  login: vi.fn(),
}))

vi.mock('@/composables/useLtiSession', () => ({
  useLtiSession: () => ({
    isActive: () => !!h.ltiToken,
    getToken: () => h.ltiToken,
    clear: h.clear,
  }),
}))

vi.mock('@/composables/useKeycloak', () => ({
  useKeycloak: () => ({
    getAccessToken: async () => h.keycloakToken,
    ensureValidToken: h.ensureValidToken,
    login: h.login,
  }),
}))

import { authorizationFor, handleUnauthorized } from '@/api/axios'

describe('authorizationFor', () => {
  beforeEach(() => {
    h.ltiToken = null
    h.keycloakToken = 'kc-token'
  })

  it('uses the Keycloak token outside a launched session', async () => {
    expect(await authorizationFor('/deployments/d1/stream')).toBe('Bearer kc-token')
  })

  it('uses the LTI session token in a launched session', async () => {
    h.ltiToken = 'lti-token'
    expect(await authorizationFor('/deployments/d1/stream')).toBe('Bearer lti-token')
  })

  it('never sends the LTI token to /lti/link', async () => {
    h.ltiToken = 'lti-token'
    expect(await authorizationFor('/lti/link')).toBe('Bearer kc-token')
  })

  it('returns null when there is no token at all', async () => {
    h.keycloakToken = null
    expect(await authorizationFor('/apps')).toBeNull()
  })
})

describe('handleUnauthorized', () => {
  beforeEach(() => {
    h.ltiToken = null
    vi.clearAllMocks()
  })

  it('drops an expired LTI session and sends the tab to /lti/expired', async () => {
    h.ltiToken = 'lti-token'
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign, pathname: '/deployments' })

    await handleUnauthorized()

    expect(h.clear).toHaveBeenCalled()
    expect(assign).toHaveBeenCalledWith('/lti/expired')
    expect(h.login).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('sends a Keycloak user to the login once the token cannot be refreshed', async () => {
    h.ensureValidToken.mockResolvedValue(false)
    vi.stubGlobal('location', { ...window.location, pathname: '/deployments' })

    await handleUnauthorized()

    expect(h.login).toHaveBeenCalledWith('/deployments')
    vi.unstubAllGlobals()
  })
})
