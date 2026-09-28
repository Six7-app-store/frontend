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
import { AlertCircle, Network, RefreshCw, Server, Shield } from 'lucide-vue-next'
import InfrastructureVmCard from '@/components/InfrastructureVmCard.vue'
import type { DeploymentResource } from '@/types'

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
  <div class="bg-panel rounded-xl border border-subtle p-6 shadow-sm mb-8">
    <div class="flex items-center justify-between mb-5 gap-3 flex-wrap">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-line/[.07] rounded-lg">
          <Server :size="20" class="text-icon" />
        </div>
        <span class="text-lg font-semibold text-fg">{{ $t('DeploymentDetailView.infrastructure') }}</span>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="resourcesLoading"
        class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-strong hover:bg-line/[.04] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition-colors"
        :title="$t('DeploymentDetailView.refreshLiveStatus')"
      >
        <RefreshCw :size="13" :class="resourcesLoading ? 'animate-spin' : ''" />
        Aktualisieren
      </button>
    </div>

    <div
      v-if="resourcesError"
      class="text-sm p-3 rounded-lg border bg-danger-dot/10 text-danger border-danger-dot/30 mb-4 flex items-start gap-2"
    >
      <AlertCircle :size="16" class="mt-0.5 shrink-0" />
      <p>{{ resourcesError }}</p>
    </div>

    <!-- VMs — primary section, cards inherit their own visual
                 styling from ``InfrastructureVmCard``. -->
    <section class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Server :size="14" class="text-icon" />
        <h3 class="text-sm font-bold uppercase tracking-wider text-fg-muted">
          Virtuelle Maschinen
        </h3>
        <span
          v-if="vmResources.length > 0"
          class="px-2 py-0.5 bg-line/[.07] text-fg-muted text-xs font-bold rounded"
        >
          {{ vmResources.length }}
        </span>
      </div>
      <div
        v-if="resourcesLoading && vmResources.length === 0"
        class="text-sm text-fg-muted italic px-4 py-6 bg-line/[.04] rounded-lg border border-subtle text-center"
      >
        Lade VMs…
      </div>
      <div
        v-else-if="vmResources.length === 0"
        class="text-sm text-fg-muted italic px-4 py-6 bg-line/[.04] rounded-lg border border-subtle text-center"
      >
        Keine VMs im aktuellen Terraform-State.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
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

    <!-- Networks / Subnets / Floating IPs (read-only) -->
    <section v-if="networkResources.length > 0" class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Network :size="14" class="text-icon" />
        <h3 class="text-sm font-bold uppercase tracking-wider text-fg-muted">
          Netzwerk
        </h3>
        <span class="px-2 py-0.5 bg-line/[.07] text-fg-muted text-xs font-bold rounded">
          {{ networkResources.length }}
        </span>
      </div>
      <ul class="space-y-1.5 text-xs">
        <li
          v-for="res in networkResources"
          :key="res.address"
          class="px-3 py-2 bg-line/[.04] rounded-lg border border-subtle flex items-center justify-between"
        >
          <div class="min-w-0">
            <p class="font-semibold text-fg truncate">
              {{ res.display_name }}
            </p>
            <p class="text-fg-muted font-mono truncate" :title="res.address">
              {{ res.address }}
            </p>
          </div>
          <span class="text-[10px] uppercase tracking-wider bg-panel px-2 py-0.5 rounded border border-strong text-fg-muted ml-2 shrink-0">
            {{ res.category }}
          </span>
        </li>
      </ul>
    </section>

    <!-- Security Groups (read-only) -->
    <section v-if="securityResources.length > 0">
      <div class="flex items-center gap-2 mb-3">
        <Shield :size="14" class="text-icon" />
        <h3 class="text-sm font-bold uppercase tracking-wider text-fg-muted">
          Sicherheit
        </h3>
        <span class="px-2 py-0.5 bg-line/[.07] text-fg-muted text-xs font-bold rounded">
          {{ securityResources.length }}
        </span>
      </div>
      <ul class="space-y-1.5 text-xs">
        <li
          v-for="res in securityResources"
          :key="res.address"
          class="px-3 py-2 bg-line/[.04] rounded-lg border border-subtle"
        >
          <p class="font-semibold text-fg">{{ res.display_name }}</p>
          <p class="text-fg-muted font-mono">{{ res.address }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>
