<script setup lang="ts">
/**
 * The full description of an app in a reading column, with "on this page"
 * built from its section headings beside it.
 */
import { computed } from 'vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import PageToc, { type TocItem } from '@/components/ui/PageToc.vue'
import { markdownHeadings } from '@/services/markdown.service'

const props = defineProps<{ description: string }>()

const tocItems = computed<TocItem[]>(() =>
  markdownHeadings(props.description)
    .filter((heading) => heading.depth === 2)
    .map((heading) => ({ id: heading.id, label: heading.text })),
)
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-16 lg:grid-cols-[minmax(0,var(--reading-max))_var(--toc-w)]">
    <article class="min-w-0">
      <MarkdownRenderer :source="description" variant="full" />
    </article>
    <PageToc v-if="tocItems.length" :items="tocItems" class="hidden pt-1 lg:sticky lg:top-0 lg:block" />
  </div>
</template>
