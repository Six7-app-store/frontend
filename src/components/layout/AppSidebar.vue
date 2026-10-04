<script setup lang="ts">
/**
 * The app's side navigation: logo, the main sections, the admin group
 * ("Verwaltung") and help pinned to the bottom. Which links show follows the
 * route table's roles (``useRouteAccess``); which one is active follows the
 * section a route belongs to (``meta.titleKey``), so detail pages keep their
 * section highlighted.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BarChart3, GraduationCap, HelpCircle, Layers, LayoutDashboard, Palette, ShieldCheck } from 'lucide-vue-next'
import { useRole } from '@/composables/useRole'
import { useRouteAccess } from '@/composables/useRouteAccess'
import { useBranding } from '@/composables/useBranding'
import { ROUTE_NAMES } from '@/router/route-names'
import SidebarGroup from './SidebarGroup.vue'
import SidebarNavItem from './SidebarNavItem.vue'

defineProps<{
  collapsed: boolean
}>()

const { t } = useI18n()
const route = useRoute()
const { logo, logoIcon } = useBranding()
const { canAccess } = useRouteAccess()
const { isStudent } = useRole()

const isActive = (labelKey: string) => route.meta.titleKey === labelKey

const visible = <T extends { to: { name: string } }>(items: T[]) => items.filter((item) => canAccess(item.to))

const mainItems = computed(() =>
  visible([
    { to: { name: ROUTE_NAMES.home }, labelKey: 'nav.dashboard', icon: LayoutDashboard },
    {
      to: { name: ROUTE_NAMES.deploymentsList },
      labelKey: isStudent.value ? 'nav.environments' : 'nav.deployments',
      icon: BarChart3,
    },
    { to: { name: ROUTE_NAMES.apps }, labelKey: 'nav.apps', icon: Layers },
    { to: { name: ROUTE_NAMES.courses }, labelKey: 'nav.courses', icon: GraduationCap },
  ]),
)
const adminItems = computed(() =>
  visible([
    { to: { name: ROUTE_NAMES.adminApps }, labelKey: 'nav.approvals', icon: ShieldCheck },
    { to: { name: ROUTE_NAMES.adminAppearance }, labelKey: 'nav.appearance', icon: Palette },
  ]),
)
const helpItem = { to: { name: ROUTE_NAMES.help }, labelKey: 'nav.help', icon: HelpCircle }
</script>

<template>
  <aside
    class="surface-sidebar flex h-full shrink-0 flex-col transition-[width] duration-200"
    :class="collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'"
  >
    <RouterLink
      :to="{ name: ROUTE_NAMES.home }"
      class="flex h-topbar shrink-0 items-center border-b border-faint px-5"
      :class="{ 'justify-center': collapsed }"
      aria-label="Click'n Deploy"
    >
      <!-- Collapsed, the full wordmark would shrink to an unreadable strip, so only the emblem shows. -->
      <img v-if="collapsed" :src="logoIcon" alt="" class="h-8 w-8 object-contain" />
      <img v-else :src="logo" alt="" class="h-[34px] w-auto max-w-full object-contain" />
    </RouterLink>

    <nav :aria-label="t('nav.main')" class="flex flex-1 flex-col overflow-y-auto px-3 py-4">
      <ul class="flex flex-col gap-0.5">
        <li v-for="item in mainItems" :key="item.labelKey">
          <SidebarNavItem
            :to="item.to"
            :label="t(item.labelKey)"
            :icon="item.icon"
            :active="isActive(item.labelKey)"
            :collapsed="collapsed"
          />
        </li>
      </ul>

      <SidebarGroup v-if="adminItems.length" :label="t('nav.admin')" :collapsed="collapsed">
        <li v-for="item in adminItems" :key="item.labelKey">
          <SidebarNavItem
            :to="item.to"
            :label="t(item.labelKey)"
            :icon="item.icon"
            :active="isActive(item.labelKey)"
            :collapsed="collapsed"
          />
        </li>
      </SidebarGroup>

      <!-- Help stays at the bottom however short the list above is. -->
      <ul class="mt-auto pt-2">
        <li>
          <SidebarNavItem
            :to="helpItem.to"
            :label="t(helpItem.labelKey)"
            :icon="helpItem.icon"
            :active="isActive(helpItem.labelKey)"
            :collapsed="collapsed"
          />
        </li>
      </ul>
    </nav>
  </aside>
</template>
