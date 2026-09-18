<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { useRouter } from 'vue-router'
import { Compass } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/ui/BaseButton.vue'

/**
 * 404 view. Rendered by the catch-all route for URLs that match no other
 * route, which used to leave the page empty. Same shape as ``ForbiddenView``.
 */
const router = useRouter()
const { t } = useI18n()

const goHome = () => {
  router.replace({ name: ROUTE_NAMES.dashboard })
}
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center p-6">
    <div class="text-center max-w-md">
      <div class="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Compass :size="32" class="text-gray-500" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">
        {{ t('NotFoundView.title') }}
      </h1>
      <p class="text-gray-600 mb-6">
        {{ t('NotFoundView.description') }}
      </p>
      <BaseButton @click="goHome">
        {{ t('NotFoundView.backToDashboard') }}
      </BaseButton>
    </div>
  </div>
</template>
