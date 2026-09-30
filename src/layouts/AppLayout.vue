<script setup lang="ts">
/** Shell of every signed-in page: sidebar, topbar and the scrolling content area. */
import { ref } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'

// Not persisted: the sidebar is open again after a reload.
const sidebarCollapsed = ref(false)
</script>

<template>
  <div class="flex h-screen">
    <AppSidebar :collapsed="sidebarCollapsed" />
    <div class="flex h-full min-w-0 flex-1 flex-col">
      <AppTopbar :sidebar-collapsed="sidebarCollapsed" @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />
      <main class="flex-1 overflow-y-auto px-5 py-6 lg:px-page-x lg:py-page-y">
        <slot />
      </main>
    </div>
  </div>
</template>
