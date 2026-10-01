<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AuthLayout from '@/layouts/AuthLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import UserLayout from '@/layouts/UserLayout.vue'
import Toast from '@/components/ui/Toast.vue'

const route = useRoute()

const layout = computed(() => {
  switch (route.meta.layout) {
    case 'auth':
      return AuthLayout
    case 'user':
      return UserLayout
    default:
      return AppLayout
  }
})
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
  <Toast />
</template>
