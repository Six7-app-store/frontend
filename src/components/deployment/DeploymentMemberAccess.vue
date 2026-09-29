<script setup lang="ts">
/**
 * Access pills of one team member in the Teams card: the account
 * username, the connection line for the app's protocol (ssh command,
 * RDP/VNC host:port, web URL) and the masked password, each with a
 * copy button.
 *
 * Which pills appear follows ``connectionFor`` — the app declares
 * ``protocol`` in its terraform output, so a Windows VM gets an RDP
 * address instead of an ssh command it could not answer.
 *
 * Password visibility is owned by the Teams card and toggled via
 * ``toggle-password``.
 */
import { computed } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import CopyButton from '@/components/ui/CopyButton.vue'
import { connectionFor, type AccountMatch } from '@/services/deployment-account-matching.service'
import type { TeamVm } from '@/services/deployment-outputs.service'

const props = defineProps<{
  account: AccountMatch
  /** The team's VM metadata; ``url`` is set for apps that serve a Web-UI. */
  teamVm: TeamVm | null
  passwordVisible: boolean
}>()

defineEmits<{
  (e: 'toggle-password'): void
}>()

/** The one access line for this account, or ``null`` when the app
 * ships no reachable endpoint. */
const connection = computed(() => connectionFor(props.account.data, props.teamVm?.url))

/** The ssh command already carries the account name, every other
 * protocol needs it spelled out. */
const showUsername = computed(
  () => !!props.account.data.username && connection.value?.protocol !== 'ssh',
)

const copyTitleKey = computed(() => {
  if (connection.value?.protocol === 'ssh') return 'DeploymentDetailView.copySshCommand'
  if (connection.value?.protocol === 'web') return 'DeploymentDetailView.copyUrl'
  return 'DeploymentDetailView.copyConnection'
})
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-4 text-xs font-mono text-fg-muted lg:justify-end">

    <div v-if="showUsername"
      class="flex items-center gap-1.5 bg-line/[.04] px-2 py-1 rounded border border-subtle">
      <span class="text-fg-muted font-sans text-[10px] uppercase tracking-wider flex-shrink-0">User:</span>
      <span>{{ account.data.username }}</span>
      <CopyButton :text="account.data.username" :copy-key="'user-' + account.key"
        :title="$t('DeploymentDetailView.copyUsername')" />
    </div>

    <!-- Connection pill. ``web`` renders a link, everything else plain
                                     text — an RDP address is not something a browser can open. -->
    <div v-if="connection"
      class="flex items-center gap-1.5 bg-line/[.04] px-2 py-1 rounded border border-subtle max-w-[280px]">
      <span class="text-fg-muted font-sans text-[10px] uppercase tracking-wider flex-shrink-0">{{ connection.label }}:</span>
      <a v-if="connection.href" :href="connection.href" target="_blank" rel="noopener noreferrer"
        class="text-accent-fg hover:underline truncate">{{ connection.value }}</a>
      <span v-else class="truncate">{{ connection.value }}</span>
      <CopyButton :text="connection.href ?? connection.value" :copy-key="'conn-' + account.key"
        :title="$t(copyTitleKey)" />
    </div>

    <div v-if="account.data.auth"
      class="flex items-center gap-1.5 bg-line/[.04] px-2 py-1 rounded border border-subtle min-w-[150px] justify-between">
      <div class="truncate mr-1">
        <span
          class="text-fg-muted font-sans text-[10px] uppercase tracking-wider mr-1">PW:</span>
        <template v-if="passwordVisible">{{
          account.data.auth }}</template>
        <span v-else class="tracking-widest text-fg-muted select-none">••••••••</span>
      </div>

      <div class="flex items-center gap-0.5 flex-shrink-0">
        <button @click="$emit('toggle-password')"
          class="text-fg-muted hover:text-fg-muted p-0.5 rounded hover:bg-line/[.12] transition-colors">
          <component :is="passwordVisible ? EyeOff : Eye"
            :size="12" />
        </button>
        <CopyButton :text="account.data.auth" :copy-key="'auth-' + account.key"
          :title="$t('DeploymentDetailView.copyPassword')" />
      </div>
    </div>

  </div>
</template>
