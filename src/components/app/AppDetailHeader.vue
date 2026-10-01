<script setup lang="ts">
/**
 * Name, version count and repository of an app. Those allowed get
 * "Bearbeiten" and, in the "…" menu, deleting (confirmed by the page).
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil, Trash2 } from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import type { MenuItem } from '@/components/ui/menu'

const props = defineProps<{ app: any; canEdit: boolean }>()
const emit = defineEmits<{ edit: []; delete: [] }>()

const { t } = useI18n()

// The repository reads better without its scheme; the link and the copy keep the full URL.
const repoLabel = computed(() => String(props.app.git_link ?? '').replace(/^https?:\/\//, ''))

const menuItems = computed<MenuItem[]>(() => [
  { id: 'delete', label: t('AppsDetailView.deleteApp'), icon: Trash2, danger: true },
])

function onMenu(id: string) {
  if (id === 'delete') emit('delete')
}
</script>

<template>
  <PageHeader :title="app.name" size="detail">
    <template #meta>
      <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
        <span>{{ $t('AppsDetailView.versionCount', app.versions?.length || 0) }}</span>
        <template v-if="app.git_link">
          <span class="text-disabled" aria-hidden="true">·</span>
          <span class="inline-flex min-w-0 items-center gap-1">
            <a :href="app.git_link" target="_blank" rel="noopener noreferrer" class="link truncate font-mono text-sm">
              {{ repoLabel }}
            </a>
            <CopyButton :text="app.git_link" copy-key="repo" :title="$t('AppsDetailView.copyRepo')" />
          </span>
        </template>
      </div>
    </template>
    <template v-if="canEdit" #actions>
      <BaseButton variant="secondary" @click="$emit('edit')">
        <Pencil :size="15" aria-hidden="true" />
        {{ $t('AppsDetailView.editApp') }}
      </BaseButton>
      <ActionMenu :items="menuItems" :label="$t('AppsDetailView.moreActions')" @select="onMenu" />
    </template>
  </PageHeader>
</template>
