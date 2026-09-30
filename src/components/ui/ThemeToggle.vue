<script setup lang="ts">
/** Icon button that switches between the light and the dark theme; the label names the theme it switches to. */
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const { isDark, toggleTheme } = useTheme()

const label = computed(() => t(isDark.value ? 'theme.toLight' : 'theme.toDark'))
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost btn-icon"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <Sun v-if="isDark" :size="16" :stroke-width="1.75" aria-hidden="true" />
    <Moon v-else :size="16" :stroke-width="1.75" aria-hidden="true" />
  </button>
</template>
