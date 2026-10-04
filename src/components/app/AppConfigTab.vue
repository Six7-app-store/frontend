<script setup lang="ts">
/**
 * The variables of one version that can be set when deploying it, as the
 * deployment wizard reads them from the app's repository.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { variableDisplayDescription } from '@/services/deployment-variables.service'
import type { AppVariable } from '@/types'

const props = defineProps<{
  variables: AppVariable[]
  version: string
  /** The list is still being read from the repository. */
  loading: boolean
}>()

const { t } = useI18n()

interface ConfigRow {
  key: string
  name: string
  description: string
  required: boolean
  hasDefault: boolean
}

const rows = computed<ConfigRow[]>(() =>
  props.variables.map((variable) => ({
    key: `${variable.source ?? ''}.${variable.template_key ?? ''}.${variable.name}`,
    name: variable.name,
    description: variableDisplayDescription(variable.description),
    required: Boolean(variable.required),
    hasDefault: variable.default !== undefined && variable.default !== null,
  })),
)

const columns = computed<DataTableColumn[]>(() => [
  { id: 'name', label: t('AppsDetailView.config.variable'), class: 'w-[200px]' },
  { id: 'description', label: t('AppsDetailView.config.description') },
  { id: 'required', label: t('AppsDetailView.config.required'), class: 'w-[140px]' },
])
</script>

<template>
  <div class="flex max-w-content flex-col gap-3">
    <h2 class="text-lg font-semibold text-heading">{{ $t('AppsDetailView.config.title') }}</h2>

    <div v-if="loading" class="flex items-center gap-3 py-6 text-fg-muted">
      <Spinner />
      <span>{{ $t('AppsDetailView.config.loading') }}</span>
    </div>

    <template v-else>
      <p class="text-base text-fg-muted">{{ $t('AppsDetailView.config.hint', { version }) }}</p>
      <section class="surface-panel mt-2 px-panel">
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row: ConfigRow) => row.key"
          :caption="$t('AppsDetailView.config.title')"
        >
          <template #cell-name="{ row }">
            <code class="code-chip font-mono text-sm" data-testid="config-variable">{{ row.name }}</code>
          </template>
          <template #cell-description="{ row }">
            <span class="text-fg-body">{{ row.description }}</span>
          </template>
          <template #cell-required="{ row }">
            <span :class="row.required ? 'text-fg' : 'text-fg-muted'">
              {{ row.required ? $t('AppsDetailView.yes') : $t('AppsDetailView.no') }}
            </span>
            <span v-if="row.hasDefault" class="block text-xs text-fg-muted">{{ $t('AppsDetailView.config.defaultPresent') }}</span>
          </template>
        </DataTable>
      </section>
    </template>
  </div>
</template>
