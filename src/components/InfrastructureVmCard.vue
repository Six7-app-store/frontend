<script setup lang="ts">
/**
 * One card per Compute-Instance in the Infrastructure tab.
 *
 * Renders the Stage-1 data the list endpoint ships: lifecycle state
 * (status + task_state combined into a single pill, fault message as
 * a red banner), hardware compact (flavor + RAM/vCPU/disk + AZ +
 * uptime), IPs per network. Two CTAs at the bottom — "Details"
 * opens the drawer for Stage-2, "Redeploy" prompts for confirmation
 * and dispatches the per-VM redeploy task.
 *
 * Visual posture:
 *   * ``drift === 'in_sync'`` → neutral grey border
 *   * ``drift === 'stale''``  → amber border + warn banner
 *   * ``drift === 'missing'`` → red border + prominent banner
 *
 * The redeploy button is the primary remediation for ``drift = missing``.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DeploymentResource } from '@/types'
import { formatUptime, lifecyclePillClass } from '@/composables/useVmPresentation'
import { RefreshCcw, AlertTriangle, Cpu, Network } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{
  resource: DeploymentResource
  /** When the parent has a redeploy in flight for this resource, the
   *  button shows a spinner and is disabled. Identified by address
   *  because the parent owns the redeploy state, not the card. */
  redeploying?: boolean
  /** Hides the redeploy button for users who may only inspect. */
  canRedeploy?: boolean
  /** Whether the inline detail panel under this card is currently
   *  expanded. Drives the Details button label (``Details`` vs.
   *  ``Ausblenden``) and a subtle accent on the card border so the
   *  user sees which card the open panel belongs to. */
  isExpanded?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-details', address: string): void
  (e: 'redeploy', address: string): void
}>()

// --- Lifecycle pill ---
// Combine ``status`` + ``task_state`` so ``ACTIVE · networking`` (a
// freshly booting VM) is visually distinct from ``ACTIVE`` (fully
// healthy). The colour palette is the only place the frontend
// interprets OpenStack lifecycle vocabulary — keep it tight.
const pillText = computed(() => {
  const lc = props.resource.lifecycle
  if (!lc) return 'unknown'
  const base = lc.status || 'unknown'
  if (lc.task_state) return `${base} · ${lc.task_state}`
  return base
})

const pillClass = computed(() => lifecyclePillClass(props.resource.lifecycle?.status))

// --- Drift banner ---
// Three states, only two visible: ``in_sync`` shows nothing,
// ``stale``/``missing`` show a banner that explains the gap.
const driftBanner = computed(() => {
  if (props.resource.drift === 'missing') {
    return {
      tone: 'red' as const,
      title: t('vm.drift.missingTitle'),
      hint: t('vm.drift.missingHint'),
    }
  }
  if (props.resource.drift === 'stale') {
    return {
      tone: 'amber' as const,
      title: t('vm.drift.staleTitle'),
      hint: t('vm.drift.staleHint'),
    }
  }
  return null
})

// --- Uptime ---
const uptime = computed(() => formatUptime(props.resource.hardware?.launched_at))

const flavorBrief = computed(() => {
  const hw = props.resource.hardware
  if (!hw) return null
  const parts: string[] = []
  if (hw.flavor_name) parts.push(hw.flavor_name)
  if (hw.vcpus != null) parts.push(`${hw.vcpus} ${t('vm.units.vcpu')}`)
  if (hw.ram_mb != null) parts.push(`${(hw.ram_mb / 1024).toFixed(0)} ${t('vm.units.gb')} RAM`)
  if (hw.disk_gb != null) parts.push(`${hw.disk_gb} ${t('vm.units.gb')}`)
  return parts.length > 0 ? parts.join(' · ') : null
})

const cardBorderClass = computed(() => {
  if (props.resource.drift === 'missing') return 'border-danger-dot/30 ring-1 ring-danger-dot/30'
  if (props.resource.drift === 'stale') return 'border-warning-dot/30'
  // Subtle accent when the detail panel underneath is open, so the
  // user instantly knows which card the panel belongs to.
  if (props.isExpanded) return 'border-strong ring-1 ring-accent/30'
  return 'border-subtle'
})
</script>

<template>
  <div
    class="bg-panel rounded-lg p-4 border-2 shadow-sm flex flex-col gap-3 transition-colors"
    :class="cardBorderClass"
  >
    <!-- Header: Team-Badge + VM-Name + Lifecycle-Pill -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span
            class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
            :class="resource.team
              ? 'bg-line/[.07] text-fg border-subtle'
              : 'bg-line/[.07] text-fg-muted border-subtle'"
          >
            {{ resource.team || t('vm.sharedTeam') }}
          </span>
        </div>
        <h3 class="text-base font-bold text-fg truncate" :title="resource.display_name">
          {{ resource.display_name }}
        </h3>
      </div>
      <span
        class="text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded border whitespace-nowrap"
        :class="pillClass"
      >
        {{ pillText }}
      </span>
    </div>

    <!-- Drift banner -->
    <div
      v-if="driftBanner"
      class="text-xs p-2 rounded border flex items-start gap-2"
      :class="driftBanner.tone === 'red'
        ? 'bg-danger-dot/10 text-danger border-danger-dot/30'
        : 'bg-warning-dot/10 text-warning border-warning-dot/30'"
    >
      <AlertTriangle :size="14" class="mt-0.5 shrink-0" />
      <div>
        <p class="font-semibold">{{ driftBanner.title }}</p>
        <p class="mt-0.5">{{ driftBanner.hint }}</p>
      </div>
    </div>

    <!-- Fault banner — only when status=ERROR -->
    <div
      v-if="resource.lifecycle?.fault_message"
      class="text-xs p-2 rounded border bg-danger-dot/10 text-danger border-danger-dot/30"
    >
      <p class="font-semibold mb-0.5">{{ t('vm.openstackFault') }}</p>
      <p class="font-mono break-all">{{ resource.lifecycle.fault_message }}</p>
    </div>

    <!-- Hardware row -->
    <div v-if="flavorBrief || resource.hardware?.image_name" class="flex items-start gap-2 text-xs text-fg">
      <Cpu :size="14" class="mt-0.5 shrink-0 text-icon" />
      <div class="space-y-0.5">
        <p v-if="flavorBrief">{{ flavorBrief }}</p>
        <p v-if="resource.hardware?.image_name" class="text-fg-muted">
          Image: {{ resource.hardware.image_name }}
        </p>
        <p v-else-if="resource.hardware?.image_id" class="text-fg-muted font-mono">
          Image-ID: {{ resource.hardware.image_id.slice(0, 8) }}…
        </p>
        <p v-if="resource.hardware?.availability_zone" class="text-fg-muted">
          AZ: {{ resource.hardware.availability_zone }}
        </p>
        <p v-if="uptime" class="text-fg-muted">{{ t('vm.uptimePrefix') }} {{ uptime }}</p>
      </div>
    </div>

    <!-- Addresses -->
    <div v-if="resource.addresses.length > 0" class="flex items-start gap-2 text-xs text-fg">
      <Network :size="14" class="mt-0.5 shrink-0 text-icon" />
      <div class="space-y-1 flex-1 min-w-0">
        <div
          v-for="addr in resource.addresses"
          :key="`${resource.address}::${addr.network}`"
          class="flex flex-wrap items-baseline gap-1"
        >
          <span class="text-fg-muted">{{ addr.network }}:</span>
          <span v-if="addr.fixed_ip" class="font-mono">{{ addr.fixed_ip }}</span>
          <span v-if="addr.floating_ip" class="font-mono text-fg">
            → {{ addr.floating_ip }}
          </span>
        </div>
      </div>
    </div>

    <!-- Footer: actions -->
    <div class="flex gap-2 mt-1 pt-2 border-t border-subtle">
      <button
        @click="emit('open-details', resource.address)"
        class="flex-1 text-xs font-semibold py-1.5 px-3 rounded border transition-colors"
        :class="isExpanded
          ? 'bg-line/[.12] text-fg border-strong'
          : 'border-subtle hover:bg-line/[.04]'"
      >
        {{ isExpanded ? t('vm.actions.hideDetails') : t('vm.actions.showDetails') }}
      </button>
      <button
        v-if="canRedeploy"
        @click="emit('redeploy', resource.address)"
        :disabled="redeploying"
        class="flex-1 text-xs font-semibold py-1.5 px-3 rounded border transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
        :class="resource.drift === 'missing'
          ? 'bg-danger-dot/10 text-danger border-danger-dot/30 hover:bg-danger-dot/10'
          : 'bg-panel text-danger border-danger-dot/30 hover:bg-danger-dot/10'"
      >
        <RefreshCcw :size="12" :class="redeploying ? 'animate-spin' : ''" />
        {{ redeploying ? t('vm.actions.redeploying') : t('vm.actions.redeploy') }}
      </button>
    </div>
  </div>
</template>
