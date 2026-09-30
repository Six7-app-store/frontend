<script setup lang="ts">
/** The signed-in person in the topbar; opens a menu with the profile and logout. */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronDown, LogOut, User } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTE_NAMES } from '@/router/route-names'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import type { MenuItem } from '@/components/ui/menu'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => authStore.user?.username || 'User')
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())

const items = computed<MenuItem[]>(() => [
  { id: 'profile', label: t('nav.profile'), icon: User },
  { id: 'logout', label: t('nav.logout'), icon: LogOut },
])

function onSelect(id: string) {
  if (id === 'profile') void router.push({ name: ROUTE_NAMES.user })
  else if (id === 'logout') void authStore.logout()
}
</script>

<template>
  <ActionMenu :items="items" :label="userName" @select="onSelect">
    <template #trigger="{ triggerAttrs, open }">
      <button type="button" class="btn btn-ghost gap-2 px-2" v-bind="triggerAttrs">
        <span class="avatar flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold" aria-hidden="true">
          {{ userInitial }}
        </span>
        <span class="max-w-28 truncate text-base font-normal text-fg">{{ userName }}</span>
        <ChevronDown
          :size="14"
          class="text-icon transition-transform duration-150"
          :class="{ 'rotate-180': open }"
          aria-hidden="true"
        />
      </button>
    </template>
  </ActionMenu>
</template>
