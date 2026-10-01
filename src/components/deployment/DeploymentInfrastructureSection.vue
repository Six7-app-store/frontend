<script setup lang="ts">
/**
 * Infrastructure section of the deployment detail page: refresh button,
 * load error, one ``InfrastructureVmCard`` per VM and read-only listings
 * of networks and security groups.
 *
 * Pure presentation — state and actions live in
 * ``useDeploymentResources``; the section only emits ``refresh``,
 * ``open-details`` and ``redeploy``.
 */
import { RefreshCw } from 'lucide-vue-next'
import InfrastructureVmCard from '@/components/InfrastructureVmCard.vue'
import type { DeploymentResource } from '@/types'
import AlertBox from '@/components/ui/AlertBox.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Card from '@/components/ui/Card.vue'

defineProps<{
  resourcesLoading: boolean
  resourcesError: string | null
  vmResources: DeploymentResource[]
  networkResources: DeploymentResource[]
  securityResources: DeploymentResource[]
  /** Addresses with a redeploy task in flight. */
  redeployInFlight: Set<string>
  /** Address of the VM whose detail panel is open, if any. */
  openDrawerAddress: string | null
  /** Owner or admin — only they may redeploy a VM. */
  canRedeploy: boolean
}>()

defineEmits<{
  (e: 'refresh'): void
  (e: 'open-details', address: string): void
  (e: 'redeploy', address: string): void
}>()
</script>

<template>
  <Card :title="$t('DeploymentDetailView.infrastructure')">
    <template #actions>
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="resourcesLoading"
        :title="$t('DeploymentDetailView.refreshLiveStatus')"
        @click="$emit('refresh')"
      >
        <RefreshCw :size="13" :class="resourcesLoading ? 'animate-spin' : ''" aria-hidden="true" />
        {{ $t('vm.actions.refresh') }}
      </BaseButton>
    </template>

    <div class="flex flex-col gap-6">
      <AlertBox v-if="resourcesError" tone="danger" data-testid="resources-error">{{ resourcesError }}</AlertBox>

      <!-- VMs: the primary listing; the cards bring their own styling. -->
      <section class="flex flex-col gap-3">
        <h3 class="flex items-baseline gap-2 text-sm font-semibold text-heading">
          {{ $t('DeploymentDetailView.infra.vms') }}
          <span v-if="vmResources.length > 0" class="font-normal tabular-nums text-fg-muted">{{ vmResources.length }}</span>
        </h3>
        <p
          v-if="resourcesLoading && vmResources.length === 0"
          class="rounded-panel border border-dashed border-subtle px-4 py-6 text-center text-sm text-fg-muted"
        >
          {{ $t('DeploymentDetailView.infra.loadingVms') }}
        </p>
        <p
          v-else-if="vmResources.length === 0"
          class="rounded-panel border border-dashed border-subtle px-4 py-6 text-center text-sm text-fg-muted"
        >
          {{ $t('DeploymentDetailView.infra.noVms') }}
        </p>
        <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InfrastructureVmCard
            v-for="vm in vmResources"
            :key="vm.address"
            :resource="vm"
            :redeploying="redeployInFlight.has(vm.address)"
            :can-redeploy="canRedeploy"
            :is-expanded="openDrawerAddress === vm.address"
            @open-details="$emit('open-details', $event)"
            @redeploy="$emit('redeploy', $event)"
          />
        </div>
      </section>

      <!-- Networks / subnets / floating IPs (read-only) -->
      <section v-if="networkResources.length > 0" class="flex flex-col gap-3">
        <h3 class="flex items-baseline gap-2 text-sm font-semibold text-heading">
          {{ $t('DeploymentDetailView.infra.network') }}
          <span class="font-normal tabular-nums text-fg-muted">{{ networkResources.length }}</span>
        </h3>
        <ul class="divide-y divide-faint rounded-panel border border-subtle text-sm">
          <li v-for="res in networkResources" :key="res.address" class="flex items-center justify-between gap-3 px-3 py-2">
            <div class="min-w-0">
              <p class="truncate font-semibold text-fg">{{ res.display_name }}</p>
              <p class="truncate font-mono text-xs text-fg-muted" :title="res.address">{{ res.address }}</p>
            </div>
            <Badge class="shrink-0">{{ res.category }}</Badge>
          </li>
        </ul>
      </section>

      <!-- Security groups (read-only) -->
      <section v-if="securityResources.length > 0" class="flex flex-col gap-3">
        <h3 class="flex items-baseline gap-2 text-sm font-semibold text-heading">
          {{ $t('DeploymentDetailView.infra.security') }}
          <span class="font-normal tabular-nums text-fg-muted">{{ securityResources.length }}</span>
        </h3>
        <ul class="divide-y divide-faint rounded-panel border border-subtle text-sm">
          <li v-for="res in securityResources" :key="res.address" class="px-3 py-2">
            <p class="font-semibold text-fg">{{ res.display_name }}</p>
            <p class="font-mono text-xs text-fg-muted">{{ res.address }}</p>
          </li>
        </ul>
      </section>
    </div>
  </Card>
</template>
