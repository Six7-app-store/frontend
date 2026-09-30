<template>
  <div class="min-h-screen flex items-center justify-center px-4">

    <!-- Card -->
    <div class="surface-banner w-full max-w-md p-10">

      <!-- Logo / Titel -->
      <div class="mb-8 text-center">
        <h1>
          <img :src="logo" alt="Click'n Deploy" class="mx-auto h-20 object-contain" />
        </h1>
        <p class="text-fg-muted mt-4">
          Click'n Deploy
        </p>
      </div>

      <!-- Seiteninhalt -->
      <slot />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import logoDark from '@/assets/based-logo-dark.png'
import logoLight from '@/assets/based-logo-light.png'

const { isDark } = useTheme()
const logo = computed(() => (isDark.value ? logoDark : logoLight))
</script>
