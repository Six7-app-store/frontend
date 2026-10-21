<script setup lang="ts">
/**
 * "My Access": the caller's own credentials of every finished deployment
 * in one place, so nobody has to remember which environment page or mail
 * they were in.
 *
 * Only the caller's own data shows — ``/my-access`` filters to it and
 * refuses deployments the caller has no access to (see ``useMyAccess``).
 * The access pills are the same as on the deployment page.
 */
import { onMounted, ref } from 'vue'
import { ChevronRight, KeyRound } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import EntityListState from '@/components/ui/EntityListState.vue'
import Card from '@/components/ui/Card.vue'
import DeploymentMemberAccess from '@/components/deployment/DeploymentMemberAccess.vue'
import { provideCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useMyAccess } from '@/composables/useMyAccess'
import { ROUTE_NAMES } from '@/router/route-names'

provideCopyToClipboard()

const { entries, isLoading, loadFailed, load } = useMyAccess()

// Passwords start hidden; each one is revealed on its own.
const visiblePasswords = ref<Record<string, boolean>>({})
const togglePassword = (deploymentId: string) => {
  visiblePasswords.value = { ...visiblePasswords.value, [deploymentId]: !visiblePasswords.value[deploymentId] }
}

onMounted(load)
</script>

<template>
  <div class="max-w-page">
    <PageHeader :title="$t('MyAccessView.title')" :subtitle="$t('MyAccessView.subtitle')" />

    <EntityListState
      :is-loading="isLoading && entries.length === 0"
      :is-error="loadFailed"
      :error-message="$t('MyAccessView.loadFailed')"
      :is-empty="!isLoading && entries.length === 0"
      :icon="KeyRound"
      :empty-message="$t('MyAccessView.empty')"
    >
      <template #empty-action>
        <p class="text-sm text-fg-muted">{{ $t('MyAccessView.emptyHint') }}</p>
      </template>

      <ul class="flex flex-col gap-4">
        <li v-for="entry in entries" :key="entry.deploymentId" data-testid="my-access-entry">
          <Card :title="entry.name">
            <template #actions>
              <RouterLink
                :to="{ name: ROUTE_NAMES.deploymentsDetail, params: { id: entry.deploymentId } }"
                class="link flex items-center gap-1 text-sm"
              >
                {{ $t('MyAccessView.openEnvironment') }}
                <ChevronRight :size="14" aria-hidden="true" />
              </RouterLink>
            </template>
            <DeploymentMemberAccess
              :account="entry.account"
              :team-vm="entry.teamVm"
              :password-visible="!!visiblePasswords[entry.deploymentId]"
              @toggle-password="togglePassword(entry.deploymentId)"
            />
          </Card>
        </li>
      </ul>
    </EntityListState>
  </div>
</template>
