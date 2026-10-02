<script setup lang="ts">
/**
 * Name of an app and, below it, its status, version count and repository.
 * Editing and deleting live in the settings tab, not here.
 */
import { computed } from 'vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppVersionStatusBadge from '@/components/app/AppVersionStatusBadge.vue'
import type { AppVersionBadgeStatus } from '@/types'

const props = defineProps<{ app: any; status: AppVersionBadgeStatus }>()

// The repository reads better without its scheme; the link and the copy keep the full URL.
const repoLabel = computed(() => String(props.app.git_link ?? '').replace(/^https?:\/\//, ''))
</script>

<template>
  <PageHeader :title="app.name" size="detail">
    <template #meta>
      <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
        <AppVersionStatusBadge :status="status" size="sm" data-testid="app-status" />
        <span class="text-disabled" aria-hidden="true">·</span>
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
  </PageHeader>
</template>
