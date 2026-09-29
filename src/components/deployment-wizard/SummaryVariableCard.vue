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
  <div class="bg-panel rounded-lg border-2 border-subtle overflow-hidden">
    <div class="bg-line/[.07] px-4 py-2 border-b border-subtle flex items-center gap-2">
      <component :is="icon" :size="18" class="text-icon" />
      <h4 class="font-bold text-fg text-sm">{{ title }}</h4>
      <span class="ml-auto text-xs bg-line/[.12] text-fg px-2 py-0.5 rounded-full font-bold">
        {{ rows.length }}
      </span>
    </div>
    <div class="p-4 space-y-2 max-h-64 overflow-y-auto">
      <div v-for="row in rows" :key="row.label"
        class="flex justify-between items-start gap-3 py-2 border-b border-subtle last:border-0">
        <span class="text-sm font-semibold text-fg flex-shrink-0">{{ row.label }}</span>
        <span
          class="text-sm text-fg font-medium text-right break-all"
          :title="row.raw ? t('deployment.summary.submittedValue', { value: row.raw }) : undefined"
        >
          {{ row.value }}
        </span>
      </div>
      <p v-if="rows.length === 0" class="text-sm text-fg-muted italic text-center py-4">
        {{ emptyLabel }}
      </p>
    </div>
  </div>
</template>
