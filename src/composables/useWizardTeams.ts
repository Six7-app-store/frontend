import { computed } from 'vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { fallbackTeamName } from '@/services/deployment-draft.service'
import type { WizardTeam } from '@/services/variable-form.service'

/**
 * The draft's teams with their members, named the way the variable step
 * keys per-team and per-person values: the team name (or ``Team-n``) and
 * each member's username (else the email's local part, the first name, or
 * the start of the id).
 */
export function useWizardTeams() {
  const deploymentStore = useDeploymentStore()

  return computed<WizardTeam[]>(() => {
    const groupNames = deploymentStore.draft.groupNames || []
    const assignments = (deploymentStore.draft.assignments || {}) as Record<number, string[]>
    return groupNames.map((rawName, idx) => ({
      name: rawName || fallbackTeamName(idx),
      members: (assignments[idx] || []).map((uid) => {
        const cached = deploymentStore.studentCache.get(String(uid))
        const username = cached?.username
          || cached?.email?.split('@')[0]
          || cached?.firstName
          || String(uid).slice(0, 8)
        return { userId: String(uid), username }
      }),
    }))
  })
}
