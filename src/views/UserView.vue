<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { User, Mail, Shield, Calendar, Cloud, ChevronRight, BookOpen, Contact, Key } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useRole } from '@/composables/useRole'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { roleLabelKey, roleBadgeVariant as roleBadgeVariantFor } from '@/i18n/role-labels'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'

const authStore = useAuthStore()
const { t } = useI18n()
// The only settings entry is the OpenStack credential page, and that route
// is staff-only. For a student the whole section would be a dead link.
const { canUseOpenStack } = useRole()

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
      <p class="text-gray-500">{{ t('UserView.loading') }}</p>
    </div>

    <div v-else class="space-y-6">
      <Card class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div
              class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <User :size="32" class="text-primary" />
          </div>

          <div>
            <div class="font-semibold text-gray-900 text-lg">
              {{ user.username || 'N/A' }}
            </div>
            <Badge :variant="roleBadgeVariant">{{ roleLabel }}</Badge>
          </div>
        </div>
      </Card>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">{{ t('UserView.fields.firstName') }}</div>
            <div class="font-medium" :class="user.firstName ? 'text-gray-900' : 'text-gray-400'">
              {{ user.firstName || 'N/A' }}
            </div>
          </div>
          <Contact :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">{{ t('UserView.fields.lastName') }}</div>
            <div class="font-medium" :class="user.lastName ? 'text-gray-900' : 'text-gray-400'">
              {{ user.lastName || 'N/A' }}
            </div>
          </div>
          <Contact :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">{{ t('UserView.fields.email') }}</div>
            <div class="font-medium" :class="user.email ? 'text-gray-900' : 'text-gray-400'">
              {{ user.email || 'N/A' }}
            </div>
          </div>
          <Mail :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">{{ t('UserView.fields.course') }}</div>
            <div class="font-medium" :class="user.course?.name ? 'text-gray-900' : 'text-gray-400'">
              {{ user.course?.name || 'N/A' }}
            </div>
          </div>
          <BookOpen :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">{{ t('UserView.fields.role') }}</div>
            <div class="font-medium text-gray-900">{{ roleLabel }}</div>
          </div>
          <Shield :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">{{ t('UserView.fields.userId') }}</div>
            <div class="font-mono text-xs" :class="user.userId ? 'text-gray-600' : 'text-gray-400'">
              {{ user.userId || 'N/A' }}
            </div>
          </div>
          <User :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">{{ t('UserView.fields.registeredAt') }}</div>
            <div class="font-medium text-gray-900">{{ createdDate }}</div>
          </div>
          <Calendar :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">{{ t('UserView.fields.keycloakId') }}</div>
            <div class="font-mono text-xs" :class="user.keycloak_id ? 'text-gray-600' : 'text-gray-400'">
              {{ user.keycloak_id || 'N/A' }}
            </div>
          </div>
          <Key :size="20" class="text-primary" />
        </Card>

      </div>

      <!-- Settings — list layout rather than a card grid; same border/padding
           style as the cards above. -->
      <div v-if="canUseOpenStack" class="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold text-gray-900">{{ t('UserView.settings.title') }}</h2>
        </div>
        <router-link
          :to="{ name: ROUTE_NAMES.userOpenStack }"
          class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cloud :size="20" class="text-primary" />
            </div>
            <div>
              <div class="font-medium text-gray-900">{{ t('UserView.settings.openstackTitle') }}</div>
              <div class="text-sm text-gray-500">
                {{ t('UserView.settings.openstackHint') }}
              </div>
            </div>
          </div>
          <ChevronRight :size="18" class="text-gray-400" />
        </router-link>
      </div>
    </div>
  </div>
</template>