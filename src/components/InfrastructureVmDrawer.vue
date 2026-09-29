<script setup lang="ts">
/**
 * Inline detail panel for ONE VM, shown directly under the clicked
 * ``InfrastructureVmCard`` in the deployment-detail page's Infrastructure section.
 *
 * Renders as part of the parent's flow, like another card in the section.
 *
 * Layout: a rounded panel card (``bg-panel border shadow-sm``) matching the surrounding
 * sections, with tinted (``bg-line/[.04]``) sub-cards per data group (Identity, Lifecycle,
 * Hardware, Addresses, Ports, SGs, Volumes, Metadata).
 *
 * Purely presentational: the parent loads the detail (see
 * ``useDeploymentResources``), passes it in with its load state and listens
 * for ``reload`` and ``close``.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DeploymentResource } from '@/types'
import { formatUptime, lifecyclePillClass } from '@/composables/useVmPresentation'
import {
  X,
  RefreshCw,
  AlertTriangle,
  Server,
  Cpu,
  Network as NetworkIcon,
  Shield,
  HardDrive,
  Tag,
  Activity,
} from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{
  /** Terraform state address of the VM, shown until its detail has a name. */
  address: string
  detail: DeploymentResource | null
  isLoading: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'reload'): void
}>()

const pillClass = computed(() => lifecyclePillClass(props.detail?.lifecycle?.status))

const uptime = computed(() => formatUptime(props.detail?.hardware?.launched_at))

// --- Map network IDs / fixed IPs to the human-friendly network name.
// The Stage-2 ``ports`` block only carries the ``network_id`` (UUID).
// The Stage-1 ``addresses`` block, on the other hand, is keyed by
// the OpenStack-side network NAME (e.g. ``"NAT"``) and carries the
// fixed_ip for that network. So we walk addresses to build two cheap
// lookups: by-fixed-ip first, then by-mac as fallback.
const portNetworkName = (port: { fixed_ip: string | null; mac: string | null }): string | null => {
  const addrs = props.detail?.addresses
  if (!addrs || addrs.length === 0) return null
  if (port.fixed_ip) {
    const m = addrs.find((a) => a.fixed_ip === port.fixed_ip)
    if (m) return m.network
  }
  if (port.mac) {
    const m = addrs.find((a) => a.mac === port.mac)
    if (m) return m.network
  }
  return null
}
</script>

<template>
  <!--
    The outer container blends into the parent's Infrastruktur
    section: same ``bg-panel rounded-xl border shadow-sm`` shell as
    the deployment-page cards. ``flex flex-col`` lets the body
    consume remaining height when the parent constrains us via
    ``flex-1 min-h-0`` (sidebar context); inline-card contexts just
    grow naturally because no parent flex is constraining us. The
    ``overflow-hidden`` on this wrapper keeps the rounded corners
    intact even when the inner body has its own ``overflow-y-auto``.
  -->
  <div class="bg-panel rounded-xl border border-subtle shadow-sm overflow-hidden flex flex-col">
    <!-- Header — icon tile + title + close button. ``shrink-0`` so
         the body, not the header, absorbs any height squeeze. The
         gradient gives a soft visual top-edge without needing a
         separate accent line. -->
    <header class="shrink-0 px-5 py-4 border-b border-subtle flex items-center justify-between gap-3 bg-line/[.04]">
      <div class="flex items-center gap-3 min-w-0">
        <div class="p-2 bg-panel rounded-lg shrink-0 border border-subtle">
          <Server :size="18" class="text-icon" />
        </div>
        <div class="min-w-0">
          <p class="text-[10px] uppercase tracking-wider text-fg-muted font-bold">
            {{ t('vm.drawer.title') }}
          </p>
          <h3 class="text-base font-semibold text-fg truncate" :title="detail?.display_name || address">
            {{ detail?.display_name || address }}
          </h3>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button
          @click="emit('reload')"
          :disabled="isLoading"
          class="p-2 text-fg-muted hover:text-fg hover:bg-line/[.07] rounded-lg disabled:opacity-50 transition-colors"
          :title="t('vm.actions.refresh')"
        >
          <RefreshCw :size="15" :class="isLoading ? 'animate-spin' : ''" />
        </button>
        <button
          @click="emit('close')"
          class="p-2 text-fg-muted hover:text-fg hover:bg-line/[.07] rounded-lg transition-colors"
          :title="t('vm.actions.closeDetails')"
        >
          <X :size="16" />
        </button>
      </div>
    </header>

    <!-- Body — ``min-h-0`` is the Tailwind incantation that lets a
         flex child shrink below its content's natural size, which is
         what enables ``overflow-y-auto`` to engage when the parent
         (the sidebar's flex column) constrains us to a viewport-
         bounded height. In a non-flex context (inline card) this
         is a no-op: the body grows to fit content. -->
    <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
      <div v-if="isLoading && !detail" class="text-sm text-fg-muted italic px-4 py-6 bg-line/[.04] rounded-lg border border-subtle text-center">
        {{ t('vm.drawer.loading') }}
      </div>

      <div
        v-else-if="errorMessage"
        class="text-sm p-3 rounded-lg border bg-danger-dot/10 text-danger border-danger-dot/30 flex items-start gap-2"
      >
        <AlertTriangle :size="16" class="mt-0.5 shrink-0" />
        <p>{{ errorMessage }}</p>
      </div>

      <template v-else-if="detail">
        <!-- Identity card -->
        <section class="bg-line/[.04] rounded-lg border border-subtle p-4 space-y-3">
          <div class="flex items-center gap-2 mb-1">
            <Tag :size="14" class="text-icon" />
            <h4 class="text-sm font-semibold text-fg">{{ t('vm.drawer.sections.identity') }}</h4>
            <span
              v-if="detail.team"
              class="ml-auto text-[10px] font-bold uppercase tracking-wider bg-line/[.07] text-fg px-2 py-0.5 rounded border border-subtle"
            >
              {{ detail.team }}
            </span>
            <span
              v-else
              class="ml-auto text-[10px] font-bold uppercase tracking-wider bg-line/[.07] text-fg-muted px-2 py-0.5 rounded border border-subtle"
            >
              {{ t('vm.sharedTeam') }}
            </span>
          </div>
          <div class="text-xs space-y-1.5">
            <div class="flex items-baseline gap-2">
              <span class="text-fg-muted w-20 shrink-0">{{ t('vm.drawer.address') }}</span>
              <code class="font-mono text-fg break-all">{{ detail.address }}</code>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-fg-muted w-20 shrink-0">{{ t('vm.drawer.osUuid') }}</span>
              <code class="font-mono text-fg break-all">{{ detail.provider_id }}</code>
            </div>
          </div>
        </section>

        <!-- Lifecycle card -->
        <section
          v-if="detail.lifecycle"
          class="bg-line/[.04] rounded-lg border border-subtle p-4 space-y-3"
        >
          <div class="flex items-center gap-2 mb-1">
            <Activity :size="14" class="text-icon" />
            <h4 class="text-sm font-semibold text-fg">{{ t('vm.drawer.sections.lifecycle') }}</h4>
            <span
              v-if="detail.lifecycle.status"
              class="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
              :class="pillClass"
            >
              {{ detail.lifecycle.status }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <span class="text-fg-muted">{{ t('vm.drawer.lifecycle.taskState') }}</span>
              <p class="font-medium text-fg">{{ detail.lifecycle.task_state || '—' }}</p>
            </div>
            <div>
              <span class="text-fg-muted">{{ t('vm.drawer.lifecycle.vmState') }}</span>
              <p class="font-medium text-fg">{{ detail.lifecycle.vm_state || '—' }}</p>
            </div>
            <div>
              <span class="text-fg-muted">{{ t('vm.drawer.lifecycle.powerState') }}</span>
              <p class="font-medium text-fg">{{ detail.lifecycle.power_state || '—' }}</p>
            </div>
            <div v-if="uptime">
              <span class="text-fg-muted">{{ t('vm.uptimePrefix') }}</span>
              <p class="font-medium text-fg">{{ uptime }}</p>
            </div>
          </div>
          <div
            v-if="detail.lifecycle.fault_message"
            class="text-xs p-2 rounded border bg-danger-dot/10 text-danger border-danger-dot/30"
          >
            <p class="font-semibold mb-0.5">{{ t('vm.openstackFault') }}</p>
            <p class="font-mono break-all">{{ detail.lifecycle.fault_message }}</p>
          </div>
        </section>

        <!-- Hardware card -->
        <section
          v-if="detail.hardware"
          class="bg-line/[.04] rounded-lg border border-subtle p-4 space-y-3"
        >
          <div class="flex items-center gap-2 mb-1">
            <Cpu :size="14" class="text-icon" />
            <h4 class="text-sm font-semibold text-fg">{{ t('vm.drawer.sections.hardware') }}</h4>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <span class="text-fg-muted">{{ t('vm.drawer.hardware.flavor') }}</span>
              <p class="font-medium text-fg">{{ detail.hardware.flavor_name || '—' }}</p>
            </div>
            <div>
              <span class="text-fg-muted">{{ t('vm.units.vcpu') }}</span>
              <p class="font-medium text-fg">{{ detail.hardware.vcpus ?? '—' }}</p>
            </div>
            <div>
              <span class="text-fg-muted">{{ t('vm.drawer.hardware.ram') }}</span>
              <p class="font-medium text-fg">
                {{ detail.hardware.ram_mb != null ? `${detail.hardware.ram_mb} MB` : '—' }}
              </p>
            </div>
            <div>
              <span class="text-fg-muted">{{ t('vm.drawer.hardware.disk') }}</span>
              <p class="font-medium text-fg">
                {{ detail.hardware.disk_gb != null ? `${detail.hardware.disk_gb} ${t('vm.units.gb')}` : '—' }}
              </p>
            </div>
            <div class="col-span-2">
              <span class="text-fg-muted">{{ t('vm.drawer.hardware.image') }}</span>
              <p class="font-medium text-fg break-all">
                <span v-if="detail.hardware.image_name">{{ detail.hardware.image_name }}</span>
                <code v-else-if="detail.hardware.image_id" class="font-mono text-xs">
                  {{ detail.hardware.image_id }}
                </code>
                <span v-else>—</span>
              </p>
            </div>
            <div>
              <span class="text-fg-muted">{{ t('vm.drawer.hardware.az') }}</span>
              <p class="font-medium text-fg">{{ detail.hardware.availability_zone || '—' }}</p>
            </div>
          </div>
        </section>

        <!-- Network addresses card (high-level: one row per network name) -->
        <section
          v-if="detail.addresses && detail.addresses.length > 0"
          class="bg-line/[.04] rounded-lg border border-subtle p-4 space-y-3"
        >
          <div class="flex items-center gap-2 mb-1">
            <NetworkIcon :size="14" class="text-icon" />
            <h4 class="text-sm font-semibold text-fg">{{ t('vm.drawer.sections.addresses') }}</h4>
            <span
              class="ml-auto text-[10px] font-bold bg-line/[.12] text-fg-muted px-2 py-0.5 rounded"
            >
              {{ detail.addresses.length }}
            </span>
          </div>
          <div class="space-y-2">
            <div
              v-for="addr in detail.addresses"
              :key="`${addr.network}::${addr.fixed_ip || addr.mac || ''}`"
              class="text-xs bg-panel rounded border border-subtle p-2.5 space-y-1"
            >
              <p class="font-semibold text-fg">{{ addr.network }}</p>
              <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-fg">
                <div>
                  <span class="text-fg-muted">{{ t('vm.drawer.network.fixedIp') }}</span>
                  <code class="ml-1 font-mono">{{ addr.fixed_ip || '—' }}</code>
                </div>
                <div v-if="addr.floating_ip">
                  <span class="text-fg-muted">{{ t('vm.drawer.network.floatingIp') }}</span>
                  <code class="ml-1 font-mono text-fg">{{ addr.floating_ip }}</code>
                </div>
                <div v-if="addr.mac">
                  <span class="text-fg-muted">{{ t('vm.drawer.network.mac') }}</span>
                  <code class="ml-1 font-mono">{{ addr.mac }}</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Network ports card (low-level per-port detail) -->
        <section
          v-if="detail.ports"
          class="bg-line/[.04] rounded-lg border border-subtle p-4 space-y-3"
        >
          <div class="flex items-center gap-2 mb-1">
            <NetworkIcon :size="14" class="text-icon" />
            <h4 class="text-sm font-semibold text-fg">{{ t('vm.drawer.sections.ports') }}</h4>
            <span
              v-if="detail.ports.length > 0"
              class="ml-auto text-[10px] font-bold bg-line/[.12] text-fg-muted px-2 py-0.5 rounded"
            >
              {{ detail.ports.length }}
            </span>
          </div>
          <div v-if="detail.ports.length === 0" class="text-xs text-fg-muted italic">
            {{ t('vm.drawer.network.noPorts') }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="port in detail.ports"
              :key="port.port_id"
              class="text-xs bg-panel rounded border border-subtle p-2.5 space-y-1"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <code class="font-mono text-fg truncate" :title="port.port_id">
                    {{ port.port_id.slice(0, 8) }}…
                  </code>
                  <span
                    v-if="portNetworkName(port)"
                    class="text-[10px] font-semibold bg-line/[.04] text-fg border border-subtle px-2 py-0.5 rounded"
                    :title="port.network_id || ''"
                  >
                    {{ portNetworkName(port) }}
                  </span>
                </div>
                <span
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap"
                  :class="port.status === 'ACTIVE'
                    ? 'bg-line/[.07] text-fg border-strong'
                    : 'bg-line/[.07] text-fg-muted border-subtle'"
                >
                  {{ port.status || 'unknown' }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-fg">
                <div>
                  <span class="text-fg-muted">IP</span>
                  <code class="ml-1 font-mono">{{ port.fixed_ip || '—' }}</code>
                </div>
                <div>
                  <span class="text-fg-muted">{{ t('vm.drawer.network.mac') }}</span>
                  <code class="ml-1 font-mono">{{ port.mac || '—' }}</code>
                </div>
              </div>
              <p v-if="port.security_group_ids.length > 0" class="text-fg-muted">
                {{ t('vm.drawer.network.securityGroupCount', { count: port.security_group_ids.length }) }}
              </p>
            </div>
          </div>
        </section>

        <!-- Security Groups card -->
        <section
          v-if="detail.security_groups"
          class="bg-line/[.04] rounded-lg border border-subtle p-4 space-y-3"
        >
          <div class="flex items-center gap-2 mb-1">
            <Shield :size="14" class="text-icon" />
            <h4 class="text-sm font-semibold text-fg">{{ t('vm.drawer.sections.securityGroups') }}</h4>
            <span
              v-if="detail.security_groups.length > 0"
              class="ml-auto text-[10px] font-bold bg-line/[.12] text-fg-muted px-2 py-0.5 rounded"
            >
              {{ detail.security_groups.length }}
            </span>
          </div>
          <div v-if="detail.security_groups.length === 0" class="text-xs text-fg-muted italic">
            {{ t('vm.drawer.network.noSecurityGroups') }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="sg in detail.security_groups"
              :key="sg.id"
              class="text-xs bg-panel rounded border border-subtle p-2.5 space-y-1"
            >
              <p class="font-semibold text-fg">{{ sg.name }}</p>
              <p v-if="sg.description" class="text-fg-muted">{{ sg.description }}</p>
              <div class="flex items-center gap-2 pt-1">
                <span class="text-[10px] font-semibold uppercase tracking-wider bg-line/[.04] text-fg border border-subtle px-2 py-0.5 rounded">
                  {{ sg.ingress_rules }} {{ t('vm.drawer.network.ingress') }}
                </span>
                <span class="text-[10px] font-semibold uppercase tracking-wider bg-line/[.04] text-fg border border-subtle px-2 py-0.5 rounded">
                  {{ sg.egress_rules }} {{ t('vm.drawer.network.egress') }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Volumes card -->
        <section
          v-if="detail.volumes"
          class="bg-line/[.04] rounded-lg border border-subtle p-4 space-y-3"
        >
          <div class="flex items-center gap-2 mb-1">
            <HardDrive :size="14" class="text-icon" />
            <h4 class="text-sm font-semibold text-fg">{{ t('vm.drawer.sections.volumes') }}</h4>
            <span
              v-if="detail.volumes.length > 0"
              class="ml-auto text-[10px] font-bold bg-line/[.12] text-fg-muted px-2 py-0.5 rounded"
            >
              {{ detail.volumes.length }}
            </span>
          </div>
          <div v-if="detail.volumes.length === 0" class="text-xs text-fg-muted italic">
            {{ t('vm.drawer.volumes.empty') }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="vol in detail.volumes"
              :key="vol.volume_id"
              class="text-xs bg-panel rounded border border-subtle p-2.5 space-y-1"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="font-semibold text-fg truncate">
                  {{ vol.name || vol.volume_id.slice(0, 8) + '…' }}
                </p>
                <span
                  v-if="vol.status"
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap"
                  :class="vol.status === 'in-use'
                    ? 'bg-line/[.07] text-fg border-strong'
                    : 'bg-line/[.07] text-fg-muted border-subtle'"
                >
                  {{ vol.status }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-fg">
                <div v-if="vol.size_gb != null">
                  <span class="text-fg-muted">{{ t('vm.drawer.volumes.size') }}</span>
                  <span class="ml-1 font-medium">{{ vol.size_gb }} {{ t('vm.units.gb') }}</span>
                </div>
                <div v-if="vol.device">
                  <span class="text-fg-muted">{{ t('vm.drawer.volumes.device') }}</span>
                  <code class="ml-1 font-mono">{{ vol.device }}</code>
                </div>
              </div>
              <p v-if="vol.bootable" class="text-[10px] font-semibold uppercase tracking-wider text-fg">
                {{ t('vm.drawer.volumes.bootable') }}
              </p>
            </div>
          </div>
        </section>

        <!-- Metadata card -->
        <section
          v-if="detail.metadata && Object.keys(detail.metadata).length > 0"
          class="bg-line/[.04] rounded-lg border border-subtle p-4 space-y-3"
        >
          <div class="flex items-center gap-2 mb-1">
            <Tag :size="14" class="text-icon" />
            <h4 class="text-sm font-semibold text-fg">{{ t('vm.drawer.sections.metadata') }}</h4>
          </div>
          <div class="space-y-1 text-xs">
            <div
              v-for="(value, key) in detail.metadata"
              :key="key"
              class="flex items-baseline gap-2"
            >
              <code class="font-mono text-fg-muted shrink-0">{{ key }}</code>
              <span class="text-fg-muted">=</span>
              <span class="text-fg break-all">{{ value }}</span>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
