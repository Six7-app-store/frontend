<script setup lang="ts">
/** Description, app info and the details of the selected version. */
import { useI18n } from 'vue-i18n'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import { formatDate } from '@/utils/format'
import type { VersionInfo } from '@/services/app-presentation.service'

defineProps<{ app: any; versionInfo: VersionInfo | null }>()

const { locale } = useI18n()
</script>

<template>
  <div class="lg:col-span-2 space-y-6">

    <div>
      <h2 class="text-xl font-semibold text-fg mb-3">{{ $t('AppsDetailView.descriptionTitle') }}</h2>
      <MarkdownRenderer
        v-if="app.description && app.description.trim()"
        :source="app.description"
        variant="full"
      />
      <p
          v-else
          :lang="locale"
          class="text-fg-muted italic"
      >
        {{ $t('AppsDetailView.noDescription') }}
      </p>
    </div>

    <div class="bg-line/[.04] rounded-lg p-4 border border-subtle">
      <h3 class="text-sm font-semibold text-fg uppercase tracking-wide mb-2">{{ $t('AppsDetailView.appInfoTitle') }}</h3>
      <ul class="space-y-2 text-sm text-fg-muted">
        <li class="flex justify-between">
          <span>{{ $t('AppsDetailView.createdAt') }}</span>
          <span class="font-medium">{{ app.created_at ? formatDate(app.created_at) : '-' }}</span>
        </li>
        <li class="flex justify-between">
          <span>{{ $t('AppsDetailView.createdBy') }}</span>
          <span class="font-medium">{{ app.user?.username || $t('AppsDetailView.unknownUser') }}</span>
        </li>
      </ul>
    </div>

    <div class="bg-line/[.04] rounded-lg p-4 border border-subtle">
      <h3 class="text-sm font-semibold text-fg uppercase tracking-wide mb-2">{{ $t('AppsDetailView.versionDetailsTitle') }}</h3>
      <div v-if="versionInfo" class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-fg-muted">{{ $t('AppsDetailView.versionName') }}</span>
          <span class="font-medium text-right">{{ versionInfo.name || '-' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-fg-muted">{{ $t('AppsDetailView.versionType') }}</span>
          <span class="font-medium text-right">{{ versionInfo.type || '-' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-fg-muted">{{ $t('AppsDetailView.versionCommit') }}</span>
          <span class="font-medium text-right">{{ versionInfo.commit || '-' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-fg-muted">{{ $t('AppsDetailView.versionAuthor') }}</span>
          <span class="font-medium text-right">{{ versionInfo.author || '-' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-fg-muted">{{ $t('AppsDetailView.versionPublishedAt') }}</span>
          <span class="font-medium text-right">{{ versionInfo.published_at ? formatDate(versionInfo.published_at) : '-' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-fg-muted">{{ $t('AppsDetailView.versionPreRelease') }}</span>
          <span class="font-medium text-right">
            {{ String(versionInfo.prerelease ?? '').toLowerCase() === 'true' ? $t('AppsDetailView.yes') : (versionInfo.prerelease === '' ? '-' : $t('AppsDetailView.no')) }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-fg-muted">{{ $t('AppsDetailView.versionLink') }}</span>
          <a v-if="versionInfo.html_url" :href="versionInfo.html_url" target="_blank" rel="noopener" class="font-medium text-accent-fg hover:underline break-all">{{ versionInfo.html_url }}</a>
          <span v-else class="font-medium text-right">-</span>
        </div>
      </div>
      <p v-else class="text-xs text-fg-muted">{{ $t('AppsDetailView.noVersionInfo') }}</p>
    </div>

    <div v-if="versionInfo && versionInfo.description" class="bg-line/[.04] rounded-lg p-4 border border-subtle">
      <h3 class="text-sm font-semibold text-fg uppercase tracking-wide mb-2">{{ $t('AppsDetailView.versionDescTitle') }}</h3>
      <MarkdownRenderer :source="versionInfo.description" variant="full" />
    </div>

  </div>
</template>
