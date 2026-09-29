<script setup lang="ts">
/** The three group modes of the team-assignment step as a button row. */
import { useI18n } from 'vue-i18n'
import type { GroupMode } from '@/types'

defineProps<{ mode: GroupMode }>()
defineEmits<{ select: [mode: GroupMode] }>()

const { t } = useI18n()
const modes: GroupMode[] = ['one', 'eachUser', 'custom']
</script>

<template>
  <div class="flex gap-2">
    <button
      v-for="option in modes"
      :key="option"
      @click="$emit('select', option)"
      class="px-5 py-2.5 rounded-xl font-semibold transition-all text-sm border-2"
      :class="mode === option
        ? 'bg-accent text-on-accent border-accent shadow-lg'
        : 'bg-panel text-fg-muted border-subtle hover:border-strong hover:bg-line/[.07]'">
      {{ t(`deployment.groups.${option}`) }}
    </button>
  </div>
</template>
