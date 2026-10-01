<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { useRouter } from 'vue-router'
import { ShieldAlert } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

/**
 * 403 hint view. Rendered when the router guard blocks a route change due to a
 * missing role. A toast already reported the reason; this page gives the user a
 * way back.
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
      :icon="ShieldAlert"
      title-tag="h1"
      :title="t('ForbiddenView.title')"
      :description="t('ForbiddenView.description')"
    >
      <BaseButton @click="goHome">
        {{ t('ForbiddenView.backToDashboard') }}
      </BaseButton>
    </EmptyState>
  </div>
</template>
