<script setup lang="ts">
/**
 * One column of variables in the deployment summary (Packer or Terraform):
 * title with a count, then one row per variable. When the display differs
 * from what is submitted (an OpenStack name for an id), the submitted value
 * is the row's tooltip.
 */
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SummaryRow } from '@/services/deployment-summary.service'

defineProps<{
  title: string
  icon: Component
  rows: SummaryRow[]
  emptyLabel: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="overflow-hidden rounded-panel border border-subtle">
    <div class="flex items-center gap-2 border-b border-faint bg-line/[.03] px-4 py-2">
      <component :is="icon" :size="16" class="text-icon" aria-hidden="true" />
      <h4 class="text-sm font-semibold text-heading">{{ title }}</h4>
      <span class="ml-auto text-sm tabular-nums text-fg-muted">{{ rows.length }}</span>
    </div>
    <div class="max-h-64 overflow-y-auto px-4 py-2">
      <div v-for="row in rows" :key="row.label" data-testid="summary-var-row"
        class="flex items-start justify-between gap-3 border-b border-faint py-2 last:border-0">
        <span class="shrink-0 font-mono text-sm text-fg">{{ row.label }}</span>
        <span
          class="break-all text-right text-sm text-fg-body"
          :title="row.raw ? t('deployment.summary.submittedValue', { value: row.raw }) : undefined"
        >
          {{ row.value }}
        </span>
      </div>
      <p v-if="rows.length === 0" class="py-4 text-center text-sm text-fg-muted">
        {{ emptyLabel }}
      </p>
    </div>
  </div>
</template>
