import { computed, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRole } from '@/composables/useRole'
import type { DeploymentWithRelations } from '@/types'

/**
 * Who may see and who may act on a deployment — mirrors
 * ``backend/app/utils/capabilities.py``. The backend stays the source of
 * truth (it answers 403 or filters data); these computeds only hide the
 * affordances so the user doesn't see buttons that would fail.
 *
 * - ``isOwnerView``: tasks/logs, tofu state/outputs, the SSE live
 *   stream and the resend buttons of *other* members. Staff or owner.
 *   (The backend narrows a teacher to the owner's course teachers; the
 *   list endpoint already only returns deployments they may open.)
 * - ``canOperate``: delete, pause/resume and per-VM redeploy — the
 *   backend's ``can_operate_deployment``. Admin or owner only, so a
 *   teacher inspecting someone else's deployment gets no action buttons.
 */
export function useDeploymentOwnerView(deployment: Ref<DeploymentWithRelations | null>) {
  const authStore = useAuthStore()
  const { isAdmin, isStaff } = useRole()

  const isOwner = computed(() => {
    const ownerId = deployment.value?.userId
    return !!ownerId && String(ownerId) === String(authStore.userId)
  })

  const isOwnerView = computed(() => isStaff.value || isOwner.value)
  const canOperate = computed(() => isAdmin.value || isOwner.value)

  return { isOwnerView, canOperate }
}
