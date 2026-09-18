<script setup lang="ts">
/**
 * Teams & Members card of the deployment detail page: every team with its
 * members, their access pills and the "resend access" button.
 *
 * Owns the password visibility, keyed by account key — members that
 * resolve to the same account share it.
 */
import { ref } from 'vue'
import { User, Users } from 'lucide-vue-next'
import DeploymentMemberAccess from '@/components/deployment/DeploymentMemberAccess.vue'
import DeploymentResendAccessButton from '@/components/deployment/DeploymentResendAccessButton.vue'
import type { EnrichedTeam } from '@/services/deployment-account-matching.service'
import type { ResendState } from '@/composables/useResendAccess'
import type { DeploymentTeam } from '@/types'

defineProps<{
  /** Raw teams of the deployment; the card is hidden without any. */
  teams: DeploymentTeam[] | undefined
  /** Teams with matched accounts (``useDeploymentCredentials``). */
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
  <div v-if="teams && teams.length > 0"
    class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
    <div class="flex items-center gap-3 mb-5">
      <div class="p-2 bg-gray-100 rounded-lg">
        <Users :size="20" class="text-gray-600" />
      </div>
      <span class="text-lg font-semibold text-gray-900">
        {{ $t('DeploymentDetailView.teamsAndMembers') }}
      </span>
      <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded">
        {{ teams.length }}
      </span>
    </div>

    <div class="space-y-4">
      <div v-for="team in enrichedTeams" :key="team.teamId"
        class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-900">{{ team.name }}</span>
            <span class="text-xs text-gray-500">·</span>
            <span class="text-xs text-gray-600">
              {{ team.members.length }}
              {{ team.members.length === 1 ? 'member' : 'members' }}
            </span>
          </div>
        </div>

        <div v-if="team.members.length === 0" class="px-4 py-6 text-center text-sm text-gray-500">
          No members assigned to this team.
        </div>

        <div v-else>
          <div v-for="member in team.members" :key="member.userId"
            class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">

            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <User :size="16" />
              </div>
              <div class="min-w-0 pr-2">
                <div class="font-medium text-gray-900 truncate">{{ member.username }}</div>
                <div class="text-xs text-gray-500 truncate">{{ member.email }}</div>
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
  </div>
</template>
