<script setup lang="ts">
/** Help for signed-in users: one reading column, "on this page" beside it. */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import PageToc, { type TocItem } from '@/components/ui/PageToc.vue'

const { t } = useI18n()

const REPOS = [
  { href: 'https://github.com/six7-click-n-deploy/frontend', key: 'frontendRepo' },
  { href: 'https://github.com/six7-click-n-deploy/backend', key: 'backendRepo' },
  { href: 'https://github.com/six7-click-n-deploy/deployment', key: 'deploymentRepo' },
  { href: 'https://github.com/six7-click-n-deploy/worker', key: 'workerRepo' },
] as const

const DOCS = [
  { href: 'https://github.com/six7-click-n-deploy/deployment/blob/main/README.md', key: 'linkAdmin' },
  { href: 'https://github.com/six7-click-n-deploy/.github/blob/main/docs/technologiestack.md', key: 'linkTech' },
  { href: 'https://github.com/six7-click-n-deploy/template-app/blob/main/README.md', key: 'linkAppDev' },
] as const

const AREAS = ['Dashboard', 'Apps', 'Courses', 'Deployments'] as const

const toc = computed<TocItem[]>(() => [
  { id: 'help-problems', label: t('HelpView.troubleshooting.title') },
  { id: 'help-steps', label: t('HelpView.quickHelp.title') },
  { id: 'help-areas', label: t('HelpView.areasTitle') },
  { id: 'help-links', label: t('HelpView.resources.title') },
  { id: 'help-docs', label: t('HelpView.docs.title') },
])
</script>

<template>
  <div class="grid max-w-detail grid-cols-1 items-start gap-16 lg:grid-cols-[minmax(0,var(--reading-max))_var(--toc-w)]">
    <article class="min-w-0">
      <PageHeader :title="$t('HelpView.title')" :subtitle="$t('HelpView.subtitle')" />

      <div class="help-article flex flex-col gap-4">
      <p>{{ $t('HelpView.intro') }}</p>

      <h2 id="help-problems">{{ $t('HelpView.troubleshooting.title') }}</h2>
      <p>{{ $t('HelpView.troubleshooting.description') }}</p>
      <ul class="list-disc pl-5">
        <li>{{ $t('HelpView.troubleshooting.item1') }}</li>
        <li>{{ $t('HelpView.troubleshooting.item2') }}</li>
      </ul>

      <h2 id="help-steps">{{ $t('HelpView.quickHelp.title') }}</h2>
      <h3>{{ $t('HelpView.quickHelp.processTitle') }}</h3>
      <ol class="list-decimal pl-[22px]">
        <li>{{ $t('HelpView.quickHelp.step1') }}</li>
        <li>{{ $t('HelpView.quickHelp.step2') }}</li>
        <li>{{ $t('HelpView.quickHelp.step3') }}</li>
        <li>{{ $t('HelpView.quickHelp.step4') }}</li>
        <li>{{ $t('HelpView.quickHelp.step5') }}</li>
      </ol>

      <h2 id="help-areas">{{ $t('HelpView.areasTitle') }}</h2>
      <dl class="flex flex-col gap-0.5">
        <template v-for="area in AREAS" :key="area">
          <dt class="font-semibold text-heading">{{ $t(`HelpView.quickHelp.page${area}Title`) }}</dt>
          <dd class="mb-3">{{ $t(`HelpView.quickHelp.page${area}`) }}</dd>
        </template>
      </dl>

      <h2 id="help-links">{{ $t('HelpView.resources.title') }}</h2>
      <p>{{ $t('HelpView.resources.description') }}</p>
      <ul class="list-disc pl-5">
        <li v-for="repo in REPOS" :key="repo.key">
          <a :href="repo.href" target="_blank" rel="noopener noreferrer" class="link">{{ $t(`HelpView.resources.${repo.key}`) }}</a>
        </li>
      </ul>

      <h2 id="help-docs">{{ $t('HelpView.docs.title') }}</h2>
      <p>{{ $t('HelpView.docs.description') }}</p>
      <ul class="list-disc pl-5">
        <li v-for="doc in DOCS" :key="doc.key">
          <a :href="doc.href" target="_blank" rel="noopener noreferrer" class="link">{{ $t(`HelpView.docs.${doc.key}`) }}</a>
        </li>
      </ul>
      </div>
    </article>

    <PageToc :items="toc" class="hidden pt-2 lg:sticky lg:top-0 lg:block" />
  </div>
</template>
