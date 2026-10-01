<script setup lang="ts">
/**
 * The app's description on the left; on the right a sticky column with
 * the deploy panel (``deploy`` slot), the description's table of contents
 * and the facts about the app and the selected version.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import InfoList, { type InfoItem } from '@/components/ui/InfoList.vue'
import PageToc, { type TocItem } from '@/components/ui/PageToc.vue'
import { markdownHeadings } from '@/services/markdown.service'
import { formatDate } from '@/utils/format'
import type { VersionInfo } from '@/services/app-presentation.service'

const props = defineProps<{ app: any; versionInfo: VersionInfo | null; selectedVersion: string }>()

const { t, locale } = useI18n()

const ARTICLE_ID = 'app-description'

const hasDescription = computed(() => Boolean(props.app.description?.trim()))

// "Description" leads to the top (the opening heading, if there is one), then one entry per section.
const tocItems = computed<TocItem[]>(() => {
  const headings = markdownHeadings(props.app.description)
  const sections = headings.filter((h) => h.depth === 2)
  if (!sections.length) return []
  const top = headings[0]?.depth === 1 ? headings[0].id : ARTICLE_ID
  return [{ id: top, label: t('AppsDetailView.descriptionTitle') }, ...sections.map((h) => ({ id: h.id, label: h.text }))]
})

const appFacts = computed<InfoItem[]>(() => [
  { label: t('AppsDetailView.createdAt'), value: props.app.created_at ? formatDate(props.app.created_at) : '' },
  { label: t('AppsDetailView.createdBy'), value: props.app.user?.username || t('AppsDetailView.unknownUser') },
])

const prerelease = computed(() => {
  const value = props.versionInfo?.prerelease
  if (value === '' || value === undefined || value === null) return ''
  return String(value).toLowerCase() === 'true' ? t('AppsDetailView.yes') : t('AppsDetailView.no')
})

const versionFacts = computed<InfoItem[]>(() => {
  const info = props.versionInfo
  return [
    { label: t('AppsDetailView.versionLabel'), value: props.selectedVersion, mono: true },
    { label: t('AppsDetailView.versionName'), value: info?.name },
    { label: t('AppsDetailView.versionType'), value: info?.type },
    { label: t('AppsDetailView.versionCommit'), value: info?.commit ? info.commit.slice(0, 8) : '', mono: true },
    { label: t('AppsDetailView.versionAuthor'), value: info?.author },
    { label: t('AppsDetailView.versionPublishedAt'), value: info?.published_at ? formatDate(info.published_at) : '' },
    { label: t('AppsDetailView.versionPreRelease'), value: prerelease.value },
    { label: t('AppsDetailView.versionLink'), value: info?.html_url, href: info?.html_url || undefined },
  ]
})
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_var(--aside-w)]">
    <article :id="ARTICLE_ID" :lang="locale" class="min-w-0 scroll-mt-6">
      <MarkdownRenderer v-if="hasDescription" :source="app.description" variant="full" />
      <p v-else class="text-md italic text-fg-muted">{{ $t('AppsDetailView.noDescription') }}</p>
    </article>

    <aside class="flex flex-col gap-section lg:sticky lg:top-0">
      <slot name="deploy" />

      <PageToc v-if="tocItems.length" :items="tocItems" />

      <section class="flex flex-col gap-4 border-t border-subtle pt-5">
        <InfoList :items="appFacts" />
        <InfoList :items="versionFacts" />
        <p v-if="!versionInfo" class="text-sm text-fg-muted">{{ $t('AppsDetailView.noVersionInfo') }}</p>
        <div v-if="versionInfo?.description" class="flex flex-col gap-1">
          <p class="text-sm text-fg-muted">{{ $t('AppsDetailView.versionDescTitle') }}</p>
          <MarkdownRenderer :source="versionInfo.description" variant="compact" class="text-sm" />
        </div>
      </section>
    </aside>
  </div>
</template>
