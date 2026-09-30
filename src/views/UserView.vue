<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ChevronRight } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { roleLabelKey, roleBadgeTone as roleBadgeToneFor } from '@/i18n/role-labels'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import InfoList, { type InfoItem } from '@/components/ui/InfoList.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { formatDateTime } from '@/utils/format'

const authStore = useAuthStore()
const { t } = useI18n()

// Cast to ``any`` so fields like firstName/course are accessible without the strict user type.
const user = computed(() => authStore.user as any)

// Central role-label helpers: one source for variant + translation across views.
const roleBadgeTone = computed(() => roleBadgeToneFor(user.value?.role))
const roleLabel = computed(() => t(roleLabelKey(user.value?.role)))

const createdDate = computed(() =>
  user.value?.created_at
    ? formatDateTime(user.value.created_at, { year: 'numeric', month: 'long', day: 'numeric' })
    : '',
)

// Fields without a value are left out (InfoList), instead of a row of "N/A".
const facts = computed<InfoItem[]>(() => [
  { label: t('UserView.fields.firstName'), value: user.value?.firstName },
  { label: t('UserView.fields.lastName'), value: user.value?.lastName },
  { label: t('UserView.fields.email'), value: user.value?.email },
  { label: t('UserView.fields.course'), value: user.value?.course?.name },
  { label: t('UserView.fields.role'), value: roleLabel.value },
  { label: t('UserView.fields.registeredAt'), value: createdDate.value },
  { label: t('UserView.fields.userId'), value: user.value?.userId, mono: true },
  { label: t('UserView.fields.keycloakId'), value: user.value?.keycloak_id, mono: true },
])

</script>

<template>
  <div class="max-w-detail">
    <PageHeader :title="t('UserView.title')" :subtitle="t('UserView.subtitle')" />

    <p v-if="!user" class="py-12 text-center text-fg-muted">{{ t('UserView.loading') }}</p>

    <div v-else class="flex flex-col gap-section">
      <Card>
        <div class="flex flex-col gap-5">
          <div class="flex items-center gap-4">
            <span class="avatar flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold" aria-hidden="true">
              {{ (user.username || '?').charAt(0).toUpperCase() }}
            </span>
            <div class="flex flex-col gap-1">
              <p class="text-lg font-semibold text-heading">{{ user.username || t('UserView.notAvailable') }}</p>
              <Badge :tone="roleBadgeTone" class="self-start">{{ roleLabel }}</Badge>
            </div>
          </div>
          <div class="border-t border-faint pt-5">
            <InfoList :items="facts" />
          </div>
        </div>
      </Card>

      <Card :title="t('UserView.settings.title')" flush>
        <RouterLink
          :to="{ name: ROUTE_NAMES.userOpenStack }"
          class="hover-tint flex items-center justify-between gap-4 px-panel py-4"
        >
          <span class="flex flex-col gap-0.5">
            <span class="font-semibold text-heading">{{ t('UserView.settings.openstackTitle') }}</span>
            <span class="text-sm text-fg-muted">{{ t('UserView.settings.openstackHint') }}</span>
          </span>
          <ChevronRight :size="16" class="shrink-0 text-disabled" aria-hidden="true" />
        </RouterLink>
      </Card>
    </div>
  </div>
</template>
