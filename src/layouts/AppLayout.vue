<script setup lang="ts">
import {
  LayoutDashboard,
  BarChart3,
  Layers,
  GraduationCap,
  HelpCircle,
  User,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from 'lucide-vue-next'

import { useI18n } from 'vue-i18n'
import { LOCALE_STORAGE_KEY } from '@/utils/storage-keys'
import { useAuthStore } from '@/stores/auth.store'
import { useRouteAccess } from '@/composables/useRouteAccess'
import { useRole } from '@/composables/useRole'
import { useTheme } from '@/composables/useTheme'
import { ROUTE_NAMES } from '@/router/route-names'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

import logoDark from '@/assets/Logo.png'
import logoLight from '@/assets/Logo_lightmode.png'
import logoIcon from '@/assets/Logo-icon.png'

const { isDark } = useTheme()
const logo = computed(() => (isDark.value ? logoDark : logoLight))

const { locale, t } = useI18n()
const authStore = useAuthStore()
const { canAccess } = useRouteAccess()
// Role visibility comes from the route table via ``canAccess``; this is
// only needed for the one label that differs by role.
const { isStudent } = useRole()
const route = useRoute()

const userName = computed(() => authStore.user?.username || 'User')
const userInitial = computed(() => (authStore.user?.username ?? 'U').charAt(0).toUpperCase())

// Background and header title come from the route table's ``meta``.
const isMeshBgActive = computed(() => !!route.meta.useMeshBg)

const sidebarCollapsed = ref(false)
const userMenuOpen = ref(false)

const closeUserMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.user-menu-root')) userMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeUserMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeUserMenu))

const pageTitle = computed(() => {
  const titleKey = route.meta.titleKey as string | undefined
  if (!titleKey) return ''
  // Students never create a deployment, so for them the section is named
  // after what they find there. The route table carries one key; the
  // rename happens here rather than in every deployments route.
  if (titleKey === 'nav.deployments' && isStudent.value) return t('nav.environments')
  return t(titleKey)
})

const changeLocale = (lang: string) => {
  locale.value = lang
  localStorage.setItem(LOCALE_STORAGE_KEY, lang)
}

// Which item is highlighted: the section a route belongs to, taken from its
// ``meta.titleKey`` (the same key the item is labelled with). ``RouterLink``'s
// own active class only covers the link target and its child routes, so
// "Dashboard" was inactive under ``/dashboard`` and "Apps"/"Kurse" on their
// detail pages.
const isNavItemActive = (item: { label: string }) => route.meta.titleKey === item.label

// Visibility follows the route's ``meta.requiresRole`` (``useRouteAccess``).
const navItems = computed(() => [
  { to: { name: ROUTE_NAMES.home }, label: 'nav.dashboard', icon: LayoutDashboard },
  {
    to: { name: ROUTE_NAMES.deploymentsList },
    label: isStudent.value ? 'nav.environments' : 'nav.deployments',
    icon: BarChart3,
  },
  { to: { name: ROUTE_NAMES.apps }, label: 'nav.apps', icon: Layers },
  { to: { name: ROUTE_NAMES.courses }, label: 'nav.courses', icon: GraduationCap },
  { to: { name: ROUTE_NAMES.adminApps }, label: 'nav.approvals', icon: ShieldCheck },
  { to: { name: ROUTE_NAMES.help }, label: 'nav.help', icon: HelpCircle },
].filter(item => canAccess(item.to)))
</script>

<template>
  <div class="h-screen flex overflow-x-visible">

    <!-- Sidebar -->
    <aside
      class="surface-sidebar flex flex-col h-full flex-shrink-0 transition-colors duration-200"
      :class="sidebarCollapsed ? 'w-16' : 'w-60'"
    >

      <!-- Logo area -->
      <div class="logo-plate h-16 flex items-center px-3">
        <!-- Collapsed, the full wordmark would shrink to an unreadable strip, so only the emblem is shown. -->
        <RouterLink :to="{ name: ROUTE_NAMES.home }" class="flex items-center justify-center h-10 w-full">
          <img
            :src="sidebarCollapsed ? logoIcon : logo"
            alt="Click'n Deploy"
            class="h-full max-w-full object-contain"
          />
        </RouterLink>
      </div>

      <!-- Sidebar toggle inside navigation zone (shown only when collapsed) -->
      <div v-if="sidebarCollapsed" class="px-2 py-2 border-b">
        <button
          @click="sidebarCollapsed = false"
          class="sidebar-toggle-btn"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen :size="18" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="nav-link group"
          :class="[sidebarCollapsed ? 'nav-link-collapsed' : '', isNavItemActive(item) ? 'nav-link-active' : '']"
          active-class=""
        >
          <span class="nav-indicator" />
          <component :is="item.icon" :size="18" :stroke-width="1.75" class="nav-icon flex-shrink-0" />
          <span
            v-if="!sidebarCollapsed"
            class="transition-opacity duration-150 whitespace-nowrap"
          >{{ $t(item.label) }}</span>
          <!-- Tooltip when collapsed -->
          <span v-if="sidebarCollapsed" class="nav-tooltip">{{ $t(item.label) }}</span>
        </RouterLink>
      </nav>

    </aside>

    <!-- Main area -->
    <div class="flex-1 flex flex-col h-full min-w-0">

      <!-- Header -->
      <header class="h-16 surface-topbar flex items-center justify-between px-6 flex-shrink-0 relative">

        <!-- Left: toggle (title centered separately) -->
        <div class="flex items-center gap-3">
          <button
            v-if="!sidebarCollapsed"
            @click="sidebarCollapsed = true"
            class="btn-ghost p-1.5 rounded-control transition-colors"
            aria-label="Close sidebar"
          >
            <PanelLeftClose :size="18" :stroke-width="1.75" />
          </button>
        </div>

        <!-- Centered title (always horizontally centered in viewport) -->
        <div class="header-title">
          <span class="text-fg text-[15px] font-semibold">{{ pageTitle }}</span>
        </div>

        <!-- Right controls -->
        <div class="flex items-center gap-2">

          <!-- Language toggle -->
          <div class="segment h-8 text-xs font-semibold">
            <button
              @click="changeLocale('de')"
              :aria-pressed="locale === 'de'"
              class="segment-btn px-2.5"
            >DE</button>
            <button
              @click="changeLocale('en')"
              :aria-pressed="locale === 'en'"
              class="segment-btn px-2.5"
            >EN</button>
          </div>

          <ThemeToggle />

          <!-- User menu -->
          <div class="relative user-menu-root">
            <button
              @click="userMenuOpen = !userMenuOpen"
              class="btn-ghost flex items-center gap-2 rounded-control px-2 py-1 transition-colors"
            >
              <div class="avatar w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold">
                {{ userInitial }}
              </div>
              <span class="text-sm text-fg max-w-24 truncate">{{ userName }}</span>
              <ChevronDown
                :size="14"
                class="text-icon transition-transform duration-150"
                :class="userMenuOpen ? 'rotate-180' : ''"
              />
            </button>

            <!-- Dropdown -->
            <Transition name="dropdown">
              <div
                v-if="userMenuOpen"
                class="surface-overlay absolute right-0 top-full mt-2 w-44 py-1 z-50"
              >
                <RouterLink
                  :to="{ name: ROUTE_NAMES.user }"
                  @click="userMenuOpen = false"
                  class="menu-item flex items-center gap-2.5 px-4 py-2 text-sm text-fg"
                >
                  <User :size="15" class="text-icon" />
                  {{ t('nav.profile') }}
                </RouterLink>
                <div class="my-1 border-t" />
                <button
                  @click="authStore.logout(); userMenuOpen = false"
                  class="menu-item w-full flex items-center gap-2.5 px-4 py-2 text-sm text-danger"
                >
                  <LogOut :size="15" />
                  {{ t('nav.logout') }}
                </button>
              </div>
            </Transition>
          </div>

        </div>
      </header>

      <!-- Main content -->
      <main
        class="flex-1 overflow-y-auto px-8 pt-6 pb-8"
        :class="isMeshBgActive ? 'mesh-gradient-bg' : ''"
      >
        <slot />
      </main>

    </div>
  </div>
</template>

<style scoped>
/* Nav link base */
.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--color-fg-muted));
  transition: background 150ms, color 150ms;
  text-decoration: none;
}

.nav-link:hover {
  background: var(--nav-hover-bg);
  color: rgb(var(--color-fg));
}

.nav-link-active,
.nav-link-active:hover {
  background: var(--nav-active-bg);
  box-shadow: var(--nav-active-shadow);
  color: rgb(var(--color-fg));
  font-weight: 600;
}

.nav-icon {
  color: rgb(var(--color-icon));
}
.nav-link-active .nav-icon {
  color: rgb(var(--color-fg));
}

/* Collapsed: center icons */
.nav-link-collapsed {
  padding: 10px;
  justify-content: center;
}

/* Left indicator bar */
.nav-indicator {
  position: absolute;
  left: -1px;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 18px;
  background: rgb(var(--color-accent));
  border-radius: 0 2px 2px 0;
  transition: transform 150ms ease;
}

.nav-link-active .nav-indicator {
  transform: translateY(-50%) scaleY(1);
}

/* Tooltip on collapsed state */
.nav-tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: rgb(var(--color-tooltip));
  color: rgb(var(--color-on-tooltip));
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 4px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 100ms ease;
  z-index: 100;
}

.nav-link:hover .nav-tooltip {
  opacity: 1;
}

/* Dashboard background accent */
.mesh-gradient-bg {
  background-image: var(--mesh-bg);
}

/* Sidebar toggle appearance */
.sidebar-toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgb(var(--color-fg-muted));
  transition: background 150ms, color 150ms;
}
.sidebar-toggle-btn:hover {
  background: var(--nav-hover-bg);
  color: rgb(var(--color-fg));
}

/* Header title centered in viewport */
.header-title {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  height: 4rem; /* matches h-16 */
  display: flex;
  align-items: center;
  z-index: 70;
  pointer-events: none;
}
.header-title span {
  pointer-events: none;
}

/* When collapsed, center the toggle so it doesn't overlap the first nav icon */
.w-16 > .px-2 > .sidebar-toggle-btn,
.w-16 > .px-2 > .sidebar-toggle-btn > * {
  margin-left: auto;
  margin-right: auto;
  display: block;
}

/* Hide native scrollbar when sidebar is collapsed (class w-16 applied on aside) */
.surface-sidebar.w-16 nav {
  /* Firefox */
  scrollbar-width: none;
  /* IE 10+ */
  -ms-overflow-style: none;
}
.surface-sidebar.w-16 nav::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
