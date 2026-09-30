<script setup lang="ts">
import { computed } from 'vue'
import { Globe, Clock, XCircle, MinusCircle, Lock } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { AppVersionBadgeStatus } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge.vue'

const props = defineProps<{ status: AppVersionBadgeStatus }>()
const { t } = useI18n()

const config = computed(() => {
  switch (props.status) {
    case 'new':
      return { icon: MinusCircle, label: t('AppVersionStatusBadge.new'), tone: 'neutral' as const }
    case 'pending':
      return { icon: Clock, label: t('AppVersionStatusBadge.pending'), tone: 'warning' as const }
    case 'approved':
    case 'published':
      return { icon: Globe, label: t('AppVersionStatusBadge.published'), tone: 'success' as const }
    case 'rejected':
      return { icon: XCircle, label: t('AppVersionStatusBadge.rejected'), tone: 'danger' as const }
    case 'private':
      return { icon: Lock, label: t('AppVersionStatusBadge.private'), tone: 'neutral' as const }
    default:
      return { icon: MinusCircle, label: '-', tone: 'neutral' as const }
  }
})
</script>

<template>
  <StatusBadge :tone="config.tone" :icon="config.icon">{{ config.label }}</StatusBadge>
</template>
