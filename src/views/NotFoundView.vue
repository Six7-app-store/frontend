<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { useRouter } from 'vue-router'
import { Compass } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

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
  <div class="flex min-h-[60vh] items-center justify-center">
    <EmptyState
      :icon="Compass"
      title-tag="h1"
      :title="t('NotFoundView.title')"
      :description="t('NotFoundView.description')"
    >
      <BaseButton @click="goHome">
        {{ t('NotFoundView.backToDashboard') }}
      </BaseButton>
    </EmptyState>
  </div>
</template>
