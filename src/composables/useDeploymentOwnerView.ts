import { computed, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRole } from '@/composables/useRole'
import type { DeploymentWithRelations } from '@/types'

/**
 * Owner-view vs member-view — mirrors backend/app/utils/permissions.py
 * ``is_deployment_owner_view``. Drives every gated UI element on the
 * deployment detail page: tasks/logs sections, terraform-state/outputs
 * blocks, the Delete button, the SSE live-stream connection, and the
 * resend-credentials buttons of *other* members in the same team.
 *
 * We trust the backend on the source-of-truth side (it returns 403
 * or filters data when the caller isn't owner-view); this computed
 * just hides the affordances so the user doesn't see buttons that
 * would 403 on click.
 */
export function useDeploymentOwnerView(deployment: Ref<DeploymentWithRelations | null>) {
  const authStore = useAuthStore()
  const { isStaff } = useRole()

  const isOwnerView = computed(() => {
    if (isStaff.value) return true
    const ownerId = deployment.value?.userId
    return !!ownerId && String(ownerId) === String(authStore.userId)
  })

  return { isOwnerView }
}
