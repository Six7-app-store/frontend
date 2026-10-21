import { computed } from 'vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { wizardTeams } from '@/services/deployment-draft.service'
import type { WizardTeam } from '@/services/variable-form.service'

/**
 * The draft's teams (``wizardTeams``, so they follow the split mode) with
 * their members, named the way the start step keys per-team and per-person
 * values: the team name and each member's username (else the email's local
 * part, the first name, or the start of the id).
 */
export function useWizardTeams() {
  const deploymentStore = useDeploymentStore()

  return computed<WizardTeam[]>(() => wizardTeams(deploymentStore.draft).map((team) => ({
    name: team.name,
    members: team.userIds.map((uid) => {
      const cached = deploymentStore.studentCache.get(uid)
      const username = cached?.username
        || cached?.email?.split('@')[0]
        || cached?.firstName
        || uid.slice(0, 8)
      return { userId: uid, username }
    }),
  })))
}
