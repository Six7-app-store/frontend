import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useKeycloak', () => ({
  useKeycloak: () => ({ isAuthenticated: { value: false }, logout: vi.fn() }),
}))
vi.mock('@/composables/useLtiSession', () => ({
  useLtiSession: () => ({ isActive: () => true, clear: vi.fn() }),
}))

import { useAuthStore } from '../auth.store'
import { useDeploymentStore } from '../deployment.store'
import { DRAFT_STORAGE_KEY } from '@/services/draft-storage.service'

describe('logout', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  it('removes the wizard draft and cached deployment data for the next user', async () => {
    const deployments = useDeploymentStore()
    deployments.draft.name = 'private draft'
    deployments.draft.userInputVar = { password: 'private' }
    deployments.persistDraft()
    deployments.studentCache.set('student', { email: 'private@example.org' })

    await useAuthStore().logout()

    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    expect(deployments.draft.name).toBe('')
    expect(deployments.studentCache.size).toBe(0)
  })
})
