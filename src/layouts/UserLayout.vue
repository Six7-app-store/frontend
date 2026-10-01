<script setup lang="ts">
import { ArrowLeft, User } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-names'
</script>

<template>
  <div class="min-h-screen flex flex-col">

    <!-- Header -->
    <header class="surface-topbar h-16 text-fg flex items-center justify-between px-8">
      <div class="flex items-center gap-4">
        <RouterLink
          :to="{ name: ROUTE_NAMES.dashboard }"
          class="btn-ghost rounded-control px-2 py-1 transition flex items-center gap-2 text-sm"
        >
          <ArrowLeft :size="18" :stroke-width="1.75" />
          {{ $t('action.back') }}
        </RouterLink>

        <span class="text-[15px] font-semibold">
          {{ $t('user.title') }}
        </span>
      </div>

      <User :size="18" :stroke-width="1.75" class="text-icon" />
    </header>

    <!-- Content -->
    <main class="flex-1 p-10 flex justify-center">
      <div class="w-full max-w-3xl">
        <slot />
      </div>
    </main>

  </div>
</template>
