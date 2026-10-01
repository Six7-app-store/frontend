<script setup lang="ts">
/** "On this page": anchor links to the sections of the current page. */
import { useI18n } from 'vue-i18n'

export interface TocItem {
  id: string
  label: string
}

defineProps<{
  items: TocItem[]
}>()

const { t } = useI18n()
</script>

<template>
  <nav :aria-label="t('pageToc.title')">
    <p class="mb-2 text-xs font-semibold text-fg-subtle">{{ t('pageToc.title') }}</p>
    <ul class="flex flex-col border-l border-subtle">
      <li v-for="item in items" :key="item.id">
        <a :href="`#${item.id}`" class="block py-1 pl-3 text-sm text-fg-muted transition-colors hover:text-heading">
          {{ item.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
