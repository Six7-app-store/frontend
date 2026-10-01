<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <!-- One fixed label; aria-pressed carries the on/off state. -->
  <button
    type="button"
    class="glass-control inline-flex h-8 w-8 items-center justify-center"
    :aria-label="t('theme.dark')"
    :aria-pressed="isDark"
    :title="t('theme.dark')"
    @click="toggleTheme"
  >
    <Sun v-if="isDark" :size="16" :stroke-width="1.75" aria-hidden="true" />
    <Moon v-else :size="16" :stroke-width="1.75" aria-hidden="true" />
  </button>
</template>
