import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const auth = vi.hoisted(() => ({ user: null as { userId: string; role: string } | null }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    get user() {
      return auth.user
    },
    get userId() {
      return auth.user?.userId ?? null
    },
  }),
}))

import { useDeploymentOwnerView } from '@/composables/useDeploymentOwnerView'
import type { DeploymentWithRelations } from '@/types'

const deploymentOf = (userId: string) => ref({ userId } as DeploymentWithRelations)

describe('useDeploymentOwnerView', () => {
  beforeEach(() => {
    auth.user = null
  })

  it.each(['teacher', 'admin'])('grants the owner view to %s regardless of ownership', (role) => {
    auth.user = { userId: 'someone', role }
    expect(useDeploymentOwnerView(deploymentOf('owner-1')).isOwnerView.value).toBe(true)
    expect(useDeploymentOwnerView(ref(null)).isOwnerView.value).toBe(true)
  })

  it('grants the owner view to the owning student only', () => {
    auth.user = { userId: 'owner-1', role: 'student' }
    expect(useDeploymentOwnerView(deploymentOf('owner-1')).isOwnerView.value).toBe(true)
    expect(useDeploymentOwnerView(deploymentOf('owner-2')).isOwnerView.value).toBe(false)
  })

  it('is false without a loaded deployment or user', () => {
    auth.user = { userId: 'owner-1', role: 'student' }
    expect(useDeploymentOwnerView(ref(null)).isOwnerView.value).toBe(false)
    auth.user = null
    expect(useDeploymentOwnerView(deploymentOf('owner-1')).isOwnerView.value).toBe(false)
  })

  it('reacts to the deployment being loaded', () => {
    auth.user = { userId: 'owner-1', role: 'student' }
    const deployment = ref<DeploymentWithRelations | null>(null)
    const { isOwnerView } = useDeploymentOwnerView(deployment)

    expect(isOwnerView.value).toBe(false)
    deployment.value = { userId: 'owner-1' } as DeploymentWithRelations
    expect(isOwnerView.value).toBe(true)
  })
})
