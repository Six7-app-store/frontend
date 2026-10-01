<script setup lang="ts">
/**
 * Teams & Members card of the deployment detail page: every team with its
 * members, their access pills and the "resend access" button.
 *
 * Owns the password visibility, keyed by account key — members that
 * resolve to the same account share it.
 */
import { ref } from 'vue'
import { User } from 'lucide-vue-next'
import DeploymentMemberAccess from '@/components/deployment/DeploymentMemberAccess.vue'
import DeploymentResendAccessButton from '@/components/deployment/DeploymentResendAccessButton.vue'
import type { EnrichedTeam } from '@/services/deployment-account-matching.service'
import type { ResendState } from '@/composables/useResendAccess'
import Card from '@/components/ui/Card.vue'

defineProps<{
  /** The deployment's teams with matched accounts (``useDeploymentCredentials``); the card is hidden without any. */
  enrichedTeams: EnrichedTeam[]
  isOwnerView: boolean
  currentUserId: string | null
  resendState: Record<string, ResendState>
  isDeploymentBusy: boolean
}>()

defineEmits<{
  (e: 'resend', teamId: string, userId: string): void
}>()

// Password visibility state, keyed by account index/key.
const visiblePasswords = ref<Record<string | number, boolean>>({})

const togglePasswordVisibility = (key: string | number) => {
  visiblePasswords.value[key] = !visiblePasswords.value[key]
}
</script>

<template>
  <Card v-if="enrichedTeams.length > 0" :title="$t('DeploymentDetailView.teamsAndMembers')" :count="enrichedTeams.length">

    <div class="space-y-4">
      <div v-for="team in enrichedTeams" :key="team.teamId"
        class="overflow-hidden rounded-panel border border-subtle">
        <div class="flex items-center justify-between border-b border-faint bg-line/[.03] px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-fg">{{ team.name }}</span>
            <span class="text-xs text-fg-muted">·</span>
            <span class="text-sm text-fg-muted">
              {{ $t('DeploymentDetailView.teamMemberCount', team.members.length) }}
            </span>
          </div>
        </div>

        <div v-if="team.members.length === 0" class="px-4 py-6 text-center text-sm text-fg-muted">
          {{ $t('DeploymentDetailView.noTeamMembers') }}
        </div>

        <div v-else>
          <div v-for="member in team.members" :key="member.userId"
            data-testid="member-row"
            class="hover-tint flex flex-col justify-between gap-4 border-b border-faint px-4 py-3 last:border-b-0 lg:flex-row lg:items-center">

            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="avatar w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                <User :size="16" />
              </div>
              <div class="min-w-0 pr-2">
                <div data-testid="member-username" class="truncate font-semibold text-heading">{{ member.username }}</div>
                <div class="text-xs text-fg-muted truncate">{{ member.email }}</div>
              </div>
            </div>

            <DeploymentMemberAccess v-if="member.account"
              :account="member.account"
              :team-vm="team.vm"
              :password-visible="!!visiblePasswords[member.account.key]"
              @toggle-password="togglePasswordVisibility(member.account!.key)" />

            <div class="flex-shrink-0 flex lg:justify-end">
              <DeploymentResendAccessButton v-if="isOwnerView || String(member.userId) === String(currentUserId)"
                :state="resendState[member.userId]"
                :busy="isDeploymentBusy"
                @resend="$emit('resend', team.teamId, member.userId)" />
            </div>

          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
