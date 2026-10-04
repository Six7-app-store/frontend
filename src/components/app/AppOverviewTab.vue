<script setup lang="ts">
/**
 * An app at a glance: the opening of its description with pointers to the
 * documentation and configuration tabs (only those that exist), and on the
 * right the deploy panel (``deploy`` slot) and the key facts.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RouteLocationRaw } from 'vue-router'
import InfoList, { type InfoItem } from '@/components/ui/InfoList.vue'
import { descriptionPreview } from '@/services/app-presentation.service'
import { formatDate } from '@/utils/format'

const props = defineProps<{
  app: any
  currentVersion: string
  /** Link to the documentation tab, ``null`` when the app has none. */
  docsTo: RouteLocationRaw | null
  /** Link to the configuration tab, ``null`` when the app has none. */
  configTo: RouteLocationRaw | null
}>()

const { t } = useI18n()

const summary = computed(() => descriptionPreview(props.app.description))

const facts = computed<InfoItem[]>(() => [
  { label: t('AppsDetailView.createdAt'), value: props.app.created_at ? formatDate(props.app.created_at) : '' },
  { label: t('AppsDetailView.createdBy'), value: props.app.user?.username },
  { label: t('AppsDetailView.currentVersion'), value: props.currentVersion, mono: true },
])
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_var(--aside-w)]">
    <div class="flex max-w-lead flex-col gap-section">
      <section v-if="summary.text || summary.heading" class="flex flex-col gap-2.5" data-testid="app-summary">
        <h2 v-if="summary.heading" class="text-xl font-semibold leading-snug text-heading">{{ summary.heading }}</h2>
        <p v-if="summary.text" class="text-md leading-relaxed text-fg-body">{{ summary.text }}</p>
      </section>
      <p v-else class="text-md italic text-fg-muted">{{ $t('AppsDetailView.noDescription') }}</p>

      <p v-if="docsTo || configTo" class="text-base text-fg-muted" data-testid="overview-teaser">
        <i18n-t v-if="docsTo" keypath="AppsDetailView.overviewTeaser.docs" tag="span">
          <template #link><RouterLink :to="docsTo" class="link">{{ $t('AppsDetailView.tabs.docs') }}</RouterLink></template>
        </i18n-t>
        {{ ' ' }}
        <i18n-t v-if="configTo" keypath="AppsDetailView.overviewTeaser.config" tag="span">
          <template #link><RouterLink :to="configTo" class="link">{{ $t('AppsDetailView.tabs.config') }}</RouterLink></template>
        </i18n-t>
      </p>
    </div>

    <aside class="flex flex-col gap-section">
      <slot name="deploy" />
      <InfoList :items="facts" />
    </aside>
  </div>
</template>
