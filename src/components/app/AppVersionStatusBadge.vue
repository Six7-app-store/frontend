<script setup lang="ts">
/**
 * Where an app or version stands in the store. Published, pending and
 * rejected show as a coloured dot; private and not-yet-submitted are no
 * store status in the strict sense and carry a neutral icon instead.
 */
import { computed, type Component } from 'vue'
import { Clock, Lock } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { AppVersionBadgeStatus } from '@/types'
import type { StatusTone } from '@/types/tone'
import StatusBadge from '@/components/ui/StatusBadge.vue'

const props = withDefaults(defineProps<{
  status: AppVersionBadgeStatus
  size?: 'xs' | 'sm' | 'md'
}>(), {
  size: 'sm',
})
const { t } = useI18n()

const config = computed((): { label: string; tone: StatusTone; icon?: Component } => {
  switch (props.status) {
    case 'new':
      return { icon: Clock, label: t('AppVersionStatusBadge.new'), tone: 'neutral' }
    case 'pending':
      return { label: t('AppVersionStatusBadge.pending'), tone: 'warning' }
    case 'approved':
    case 'published':
      return { label: t('AppVersionStatusBadge.published'), tone: 'success' }
    case 'rejected':
      return { label: t('AppVersionStatusBadge.rejected'), tone: 'danger' }
    case 'private':
      return { icon: Lock, label: t('AppVersionStatusBadge.private'), tone: 'neutral' }
    default:
      return { label: '-', tone: 'neutral' }
  }
})
</script>

<template>
  <StatusBadge :tone="config.tone" :icon="config.icon" :size="size">{{ config.label }}</StatusBadge>
</template>
