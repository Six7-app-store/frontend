<script setup lang="ts">
/**
 * Glass bar above the content: sidebar toggle and breadcrumb on the left,
 * language, theme and user menu on the right. No page title — the breadcrumb
 * and the page's own header say where you are.
 */
import { useI18n } from 'vue-i18n'
import { PanelLeft } from 'lucide-vue-next'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import BaseButton from '@/components/ui/BaseButton.vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import LocaleSwitch from './LocaleSwitch.vue'
import UserMenu from './UserMenu.vue'

defineProps<{
  sidebarCollapsed: boolean
}>()

defineEmits<{ toggleSidebar: [] }>()

const { t } = useI18n()
const { items } = useBreadcrumbs()
</script>

<template>
  <header class="surface-topbar flex h-topbar shrink-0 items-center justify-between gap-3 pl-4 pr-6">
    <div class="flex min-w-0 items-center gap-3">
      <BaseButton
        variant="ghost"
        icon
        :label="t(sidebarCollapsed ? 'nav.expand' : 'nav.collapse')"
        :aria-expanded="!sidebarCollapsed"
        @click="$emit('toggleSidebar')"
      >
        <PanelLeft :size="18" :stroke-width="1.75" aria-hidden="true" />
      </BaseButton>
      <Breadcrumb :items="items" />
    </div>

    <div class="flex shrink-0 items-center gap-3">
      <LocaleSwitch />
      <ThemeToggle />
      <span class="h-5 w-px shrink-0 bg-line/10" aria-hidden="true" />
      <UserMenu />
    </div>
  </header>
</template>
