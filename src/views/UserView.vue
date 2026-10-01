<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { User, Mail, Shield, Calendar, Cloud, ChevronRight, BookOpen, Contact, Key } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { roleLabelKey, roleBadgeVariant as roleBadgeVariantFor } from '@/i18n/role-labels'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'

const authStore = useAuthStore()
const { t } = useI18n()

// Cast to ``any`` so fields like firstName/course are accessible without the strict user type.
const user = computed(() => authStore.user as any)

// Central role-label helpers: one source for variant + translation across views.
const roleBadgeVariant = computed(() => roleBadgeVariantFor(user.value?.role))
const roleLabel = computed(() => t(roleLabelKey(user.value?.role)))

const createdDate = computed(() => {
  if (!user.value?.created_at) return 'N/A'
  return new Date(user.value.created_at).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

</script>

<template>
  <div class="p-6">

    <PageHeader :title="t('UserView.title')" :subtitle="t('UserView.subtitle')" />

    <div v-if="!user" class="text-center py-12">
      <p class="text-fg-muted">{{ t('UserView.loading') }}</p>
    </div>

    <div v-else class="space-y-6">
      <Card class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div
              class="avatar w-16 h-16 rounded-full flex items-center justify-center"
          >
            <User :size="32" class="text-icon" />
          </div>

          <div>
            <div class="font-semibold text-fg text-lg">
              {{ user.username || 'N/A' }}
            </div>
            <Badge :variant="roleBadgeVariant">{{ roleLabel }}</Badge>
          </div>
        </div>
      </Card>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-fg-muted mb-1">{{ t('UserView.fields.firstName') }}</div>
            <div class="font-medium" :class="user.firstName ? 'text-fg' : 'text-fg-muted'">
              {{ user.firstName || 'N/A' }}
            </div>
          </div>
          <Contact :size="20" class="text-icon" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-fg-muted mb-1">{{ t('UserView.fields.lastName') }}</div>
            <div class="font-medium" :class="user.lastName ? 'text-fg' : 'text-fg-muted'">
              {{ user.lastName || 'N/A' }}
            </div>
          </div>
          <Contact :size="20" class="text-icon" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-fg-muted mb-1">{{ t('UserView.fields.email') }}</div>
            <div class="font-medium" :class="user.email ? 'text-fg' : 'text-fg-muted'">
              {{ user.email || 'N/A' }}
            </div>
          </div>
          <Mail :size="20" class="text-icon" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-fg-muted mb-1">{{ t('UserView.fields.course') }}</div>
            <div class="font-medium" :class="user.course?.name ? 'text-fg' : 'text-fg-muted'">
              {{ user.course?.name || 'N/A' }}
            </div>
          </div>
          <BookOpen :size="20" class="text-icon" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-fg-muted mb-1">{{ t('UserView.fields.role') }}</div>
            <div class="font-medium text-fg">{{ roleLabel }}</div>
          </div>
          <Shield :size="20" class="text-icon" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-fg-muted mb-1">{{ t('UserView.fields.userId') }}</div>
            <div class="font-mono text-xs" :class="user.userId ? 'text-fg-muted' : 'text-fg-muted'">
              {{ user.userId || 'N/A' }}
            </div>
          </div>
          <User :size="20" class="text-icon" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-fg-muted mb-1">{{ t('UserView.fields.registeredAt') }}</div>
            <div class="font-medium text-fg">{{ createdDate }}</div>
          </div>
          <Calendar :size="20" class="text-icon" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-fg-muted mb-1">{{ t('UserView.fields.keycloakId') }}</div>
            <div class="font-mono text-xs" :class="user.keycloak_id ? 'text-fg-muted' : 'text-fg-muted'">
              {{ user.keycloak_id || 'N/A' }}
            </div>
          </div>
          <Key :size="20" class="text-icon" />
        </Card>

      </div>

      <!-- Settings — list layout rather than a card grid; same border/padding
           style as the cards above. -->
      <div class="bg-panel rounded-2xl shadow-md border border-subtle overflow-hidden">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold text-fg">{{ t('UserView.settings.title') }}</h2>
        </div>
        <router-link
          :to="{ name: ROUTE_NAMES.userOpenStack }"
          class="flex items-center justify-between px-6 py-4 hover:bg-line/[.04] transition-colors"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-control bg-line/[.07] border border-subtle flex items-center justify-center">
              <Cloud :size="20" class="text-icon" />
            </div>
            <div>
              <div class="font-medium text-fg">{{ t('UserView.settings.openstackTitle') }}</div>
              <div class="text-sm text-fg-muted">
                {{ t('UserView.settings.openstackHint') }}
              </div>
            </div>
          </div>
          <ChevronRight :size="18" class="text-icon" />
        </router-link>
      </div>
    </div>
  </div>
</template>