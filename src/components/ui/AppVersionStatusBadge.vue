<script setup lang="ts">
import { computed } from 'vue'
import { Globe, Clock, XCircle, MinusCircle, Lock } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { AppVersionBadgeStatus } from '@/types'

const props = defineProps<{ status: AppVersionBadgeStatus }>()
const { t } = useI18n()

const config = computed(() => {
  switch (props.status) {
    case 'new':
      return { icon: MinusCircle, label: t('AppVersionStatusBadge.new'), classes: 'status-neutral' }
    case 'pending':
      return { icon: Clock, label: t('AppVersionStatusBadge.pending'), classes: 'status-warning' }
    case 'approved':
    case 'published':
      return { icon: Globe, label: t('AppVersionStatusBadge.published'), classes: 'status-success' }
    case 'rejected':
      return { icon: XCircle, label: t('AppVersionStatusBadge.rejected'), classes: 'status-danger' }
    case 'private':
      return { icon: Lock, label: t('AppVersionStatusBadge.private'), classes: 'status-emphasis' }
    default:
      return { icon: MinusCircle, label: '-', classes: 'status-neutral' }
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-tag text-xs font-medium border"
    :class="config.classes"
  >
    <component :is="config.icon" :size="11" />
    {{ config.label }}
  </span>
</template>
