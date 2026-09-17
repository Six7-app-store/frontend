<script setup lang="ts">
/**
 * Access pills of one team member in the Teams card: username + web URL
 * (web-UI apps), per-user URL, ready-to-use SSH command and the masked
 * password, each with a copy button.
 *
 * Copy buttons share the page-wide "just copied" state
 * (``injectCopyToClipboard``); password visibility is owned by the
 * Teams card and toggled via ``toggle-password``.
 */
import { Check, Copy, Eye, EyeOff } from 'lucide-vue-next'
import { injectCopyToClipboard } from '@/composables/useCopyToClipboard'
import { sshCommandFor, userUrlFor, type AccountMatch } from '@/services/deployment-account-matching.service'
import type { TeamVm } from '@/services/deployment-outputs.service'

defineProps<{
  account: AccountMatch
  /** The team's VM metadata; ``url`` is set for apps that serve a Web-UI. */
  teamVm: TeamVm | null
  passwordVisible: boolean
}>()

defineEmits<{
  (e: 'toggle-password'): void
}>()

const { copiedKey, copyToClipboard } = injectCopyToClipboard()
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-600 lg:justify-end">

    <!-- Web-app URL from ``team_vms.<team>.url``,
                                     shared by every team member. When set, the
                                     SSH pill is dropped and the username shows next to it. -->
    <div v-if="teamVm?.url"
      class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
      <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wider flex-shrink-0">User:</span>
      <span>{{ account.data.username }}</span>
      <button
        @click="copyToClipboard(account.data.username, 'user-' + account.key)"
        class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
        :title="copiedKey === 'user-' + account.key ? 'Kopiert!' : 'Username kopieren'">
        <component :is="copiedKey === 'user-' + account.key ? Check : Copy" :size="12" />
      </button>
    </div>

    <div v-if="account.data.ip && account.data.port && account.data.type !== 'ssh_key' && account.data.authtype !== 'ssh' && account.data.port !== 22"
      class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100 max-w-[280px]">
      <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wider flex-shrink-0">URL:</span>
      <a :href="userUrlFor(account.data, teamVm?.url) ?? ''" target="_blank" rel="noopener noreferrer"
        class="text-blue-600 hover:underline truncate">{{ userUrlFor(account.data, teamVm?.url)?.replace(/^https?:\/\//, '') }}</a>
      <button
        @click="copyToClipboard(userUrlFor(account.data, teamVm?.url) ?? '', 'vmurl-' + account.key)"
        class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
        :title="copiedKey === 'vmurl-' + account.key ? 'Kopiert!' : 'URL kopieren'">
        <component :is="copiedKey === 'vmurl-' + account.key ? Check : Copy" :size="12" />
      </button>
    </div>
    <div v-else-if="teamVm?.url"
      class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100 max-w-[280px]">
      <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wider flex-shrink-0">URL:</span>
      <a :href="teamVm.url" target="_blank" rel="noopener noreferrer"
        class="text-blue-600 hover:underline truncate">{{ teamVm.url.replace(/^https?:\/\//, '') }}</a>
      <button
        @click="copyToClipboard(teamVm.url, 'vmurl-' + account.key)"
        class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
        :title="copiedKey === 'vmurl-' + account.key ? 'Kopiert!' : 'URL kopieren'">
        <component :is="copiedKey === 'vmurl-' + account.key ? Check : Copy" :size="12" />
      </button>
    </div>

    <!-- Ready-to-use SSH command line — already
                                     includes username, IP and (for non-22) the port. -->
    <div v-if="!teamVm?.url && account.data.ip && account.data.username && (!account.data.authtype || account.data.authtype === 'ssh')"
      class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100 max-w-full">
      <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wider flex-shrink-0">SSH:</span>
      <span class="truncate">{{ sshCommandFor(account.data) }}</span>
      <button
        @click="copyToClipboard(sshCommandFor(account.data), 'ssh-' + account.key)"
        class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
        :title="copiedKey === 'ssh-' + account.key ? 'Kopiert!' : 'SSH-Befehl kopieren'">
        <component :is="copiedKey === 'ssh-' + account.key ? Check : Copy" :size="12" />
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
          :title="copiedKey === 'auth-' + account.key ? 'Kopiert!' : 'Passwort kopieren'">
          <component :is="copiedKey === 'auth-' + account.key ? Check : Copy"
            :size="12" />
        </button>
      </div>
    </div>

  </div>
</template>
