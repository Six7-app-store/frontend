import { computed, ref, type Ref } from 'vue'
import { deploymentApi } from '@/api/deployment.api'
import { extractTeamVms, extractUserAccounts, type TeamVm, type UserAccount } from '@/services/deployment-outputs.service'
import { matchTeamAccounts } from '@/services/deployment-account-matching.service'
import type { DeploymentWithRelations, Task } from '@/types'

/**
 * Access credentials for the Teams card of the deployment detail page.
 *
 * Owners read ``user_accounts`` / ``team_vms`` from the active data task's
 * terraform outputs; members load their own entry via ``/my-access``
 * (:func:`loadMyAccess`). ``enrichedTeams`` combines both with the
 * deployment's teams (see ``services/deployment-account-matching.service``).
 */
export function useDeploymentCredentials(
  deploymentId: string,
  deployment: Ref<DeploymentWithRelations | null>,
  activeDataTask: Ref<Task | null>,
) {
  // Member self-access: a non-owner (student) can't read the owner-only
  // task outputs, so we fetch just their own credentials from the
  // dedicated ``/my-access`` endpoint into this map. It mirrors the raw
  // ``user_accounts.value`` shape so ``typedUserAccounts`` can fall back
  // to it and the existing account-matching pipeline works unchanged.
  const myAccounts = ref<Record<string, UserAccount> | null>(null)
  const myTeamVms = ref<Record<string, TeamVm> | null>(null)

  // Credentials and team VMs of the active data task; members fall back to
  // their own ``/my-access`` data (see ``services/deployment-outputs.service``).
  const typedUserAccounts = computed<Record<string, UserAccount> | null>(() =>
    extractUserAccounts(activeDataTask.value?.outputs, myAccounts.value)
  )
  const teamVms = computed<Record<string, TeamVm> | null>(() =>
    extractTeamVms(activeDataTask.value?.outputs, myTeamVms.value)
  )

  // Teams with ``team.vm`` and each member's matched ``account`` for the
  // Teams card (see ``services/deployment-account-matching.service``).
  const enrichedTeams = computed(() => {
    const currentDeployment = deployment.value
    if (!currentDeployment?.teams) return []
    return matchTeamAccounts(currentDeployment.teams, typedUserAccounts.value, teamVms.value)
  })

  // Member view: the owner-only task outputs are off-limits, so
  // fetch just this member's own credentials from ``/my-access``.
  // ``typedUserAccounts`` / ``teamVms`` fall back to these,
  // and the Teams-card credential block renders as for the owner.
  const loadMyAccess = async () => {
    try {
      const { data } = await deploymentApi.getMyAccess(deploymentId)
      // The API type marks fields optional; the local UserAccount
      // interface is stricter but structurally compatible at the
      // point of use, so cast the map through unknown.
      myAccounts.value = (data.user_accounts ?? null) as Record<string, UserAccount> | null
      myTeamVms.value = data.team_vms ?? null
    } catch (err) {
      // Deliberately silent: a member without (loadable) credentials simply
      // sees no access pills — the page itself still works.
      console.error('Error loading own access credentials:', err)
    }
  }

  return {
    typedUserAccounts,
    teamVms,
    enrichedTeams,
    loadMyAccess,
  }
}
