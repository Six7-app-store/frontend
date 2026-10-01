<script setup lang="ts">
/**
 * An app in the catalogue: name, store status, the description's opening
 * heading and first paragraph. With ``to`` the whole card is the link; the
 * "Details & Deployment" line only says where it goes. Without ``to`` it is
 * the static preview of the create form.
 */
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppVersionStatusBadge from '@/components/app/AppVersionStatusBadge.vue'
import { descriptionPreview } from '@/services/app-presentation.service'
import type { AppVersionBadgeStatus } from '@/types'

const props = defineProps<{
  name: string
  description?: string | null
  status?: AppVersionBadgeStatus | null
  to?: RouteLocationRaw
  /** Shown instead of an empty description. */
  emptyText: string
}>()

const { locale } = useI18n()

const preview = computed(() => descriptionPreview(props.description))
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to"
    class="surface-panel flex h-[184px] flex-col gap-2 p-panel"
    :class="{ 'panel-interactive': to }"
    data-testid="app-card"
  >
    <div class="mb-1 flex items-baseline justify-between gap-3">
      <h2 class="truncate text-lg font-semibold text-heading">{{ name }}</h2>
      <AppVersionStatusBadge v-if="status" :status="status" size="xs" />
    </div>

    <template v-if="preview.heading || preview.text">
      <p v-if="preview.heading" :lang="locale" class="line-clamp-2 text-sm font-semibold leading-snug text-fg-body">
        {{ preview.heading }}
      </p>
      <p :lang="locale" class="line-clamp-2 text-sm text-fg-muted">{{ preview.text }}</p>
    </template>
    <p v-else class="text-sm italic text-fg-muted">{{ emptyText }}</p>

    <span class="mt-auto inline-flex items-center gap-1 self-end text-sm text-nav">
      {{ $t('AppsView.detailsDeploy') }}
      <ChevronRight :size="16" class="text-disabled" aria-hidden="true" />
    </span>
  </component>
</template>
