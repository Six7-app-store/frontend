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
 * Copy buttons share the page-wide "just copied" state
 * (``injectCopyToClipboard``); password visibility is owned by the
 * Teams card and toggled via ``toggle-password``.
 */
import { computed } from 'vue'
import { Check, Copy, Eye, EyeOff } from 'lucide-vue-next'
import { injectCopyToClipboard } from '@/composables/useCopyToClipboard'
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

const { copiedKey, copyToClipboard } = injectCopyToClipboard()

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
    class="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-600 lg:justify-end">

    <div v-if="showUsername"
      class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
      <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wider flex-shrink-0">User:</span>
      <span>{{ account.data.username }}</span>
      <button
        @click="copyToClipboard(account.data.username, 'user-' + account.key)"
        class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
        :title="copiedKey === 'user-' + account.key ? $t('DeploymentDetailView.copied') : $t('DeploymentDetailView.copyUsername')">
        <component :is="copiedKey === 'user-' + account.key ? Check : Copy" :size="12" />
      </button>
    </div>

    <!-- Connection pill. ``web`` renders a link, everything else plain
                                     text — an RDP address is not something a browser can open. -->
    <div v-if="connection"
      class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100 max-w-[280px]">
      <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wider flex-shrink-0">{{ connection.label }}:</span>
      <a v-if="connection.href" :href="connection.href" target="_blank" rel="noopener noreferrer"
        class="text-blue-600 hover:underline truncate">{{ connection.value }}</a>
      <span v-else class="truncate">{{ connection.value }}</span>
      <button
        @click="copyToClipboard(connection.href ?? connection.value, 'conn-' + account.key)"
        class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
        :title="copiedKey === 'conn-' + account.key ? $t('DeploymentDetailView.copied') : $t(copyTitleKey)">
        <component :is="copiedKey === 'conn-' + account.key ? Check : Copy" :size="12" />
      </button>
    </div>

    <div v-if="account.data.auth"
      class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100 min-w-[150px] justify-between">
      <div class="truncate mr-1">
        <span
          class="text-gray-400 font-sans text-[10px] uppercase tracking-wider mr-1">PW:</span>
        <template v-if="passwordVisible">{{
          account.data.auth }}</template>
        <span v-else class="tracking-widest text-gray-400 select-none">••••••••</span>
      </div>

      <div class="flex items-center gap-0.5 flex-shrink-0">
        <button @click="$emit('toggle-password')"
          class="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-200 transition-colors">
          <component :is="passwordVisible ? EyeOff : Eye"
            :size="12" />
        </button>
        <button
          @click="copyToClipboard(account.data.auth, 'auth-' + account.key)"
          class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-gray-200 transition-colors"
          :title="copiedKey === 'auth-' + account.key ? $t('DeploymentDetailView.copied') : $t('DeploymentDetailView.copyPassword')">
          <component :is="copiedKey === 'auth-' + account.key ? Check : Copy"
            :size="12" />
        </button>
      </div>
    </div>

  </div>
</template>
