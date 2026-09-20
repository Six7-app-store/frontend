import { computed, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRole } from '@/composables/useRole'
import type { DeploymentWithRelations } from '@/types'

/**
 * Two separate gates, deliberately not one:
 *
 * ``isOwnerView`` — may *read* the owner-level data: tasks/logs sections,
 * terraform-state/outputs blocks, the infrastructure list, the SSE
 * live-stream connection, and the resend-credentials buttons of other
 * members in the same team. Mirrors backend
 * ``can_view_deployment_owner`` (admin, owner, or course-teacher of the
 * owner's Studiengruppe), approximated by ``isStaff``.
 *
 * ``canOperate`` — may *change* the deployment: Pause, Resume, Delete,
 * per-VM Redeploy. Mirrors ``can_operate_deployment``, which is owner or
 * admin only. A teacher who merely inspects someone else's deployment is
 * read-only, so gating those buttons on ``isOwnerView`` offered actions
 * that answer 403 on click.
 *
 * We trust the backend on the source-of-truth side; these computeds only
 * hide affordances the caller could not use.
 */
export function useDeploymentOwnerView(deployment: Ref<DeploymentWithRelations | null>) {
  const authStore = useAuthStore()
  const { isStaff, isAdmin } = useRole()

  const isOwner = computed(() => {
    const ownerId = deployment.value?.userId
    return !!ownerId && String(ownerId) === String(authStore.userId)
  })

  const isOwnerView = computed(() => isStaff.value || isOwner.value)
  const canOperate = computed(() => isAdmin.value || isOwner.value)

  return { isOwnerView, canOperate }
}
