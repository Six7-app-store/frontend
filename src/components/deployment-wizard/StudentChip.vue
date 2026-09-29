<script setup lang="ts">
/**
 * A draggable student card of the team-assignment step. The native
 * ``dragstart``/``dragend`` listeners fall through to the card; ``remove``
 * is only offered when ``removable`` is set.
 */
import { useI18n } from 'vue-i18n'
import { GripVertical, X } from 'lucide-vue-next'

defineProps<{
  name: string
  /** The smaller card used inside a team. */
  compact?: boolean
  removable?: boolean
}>()

defineEmits<{ remove: [] }>()

const { t } = useI18n()
</script>

<template>
  <div
    draggable="true"
    class="group bg-panel rounded-lg border-2 border-subtle cursor-move hover:border-strong hover:shadow-lg hover:scale-[1.02] transition-all flex items-center"
    :class="compact ? 'px-3 py-2.5 gap-2' : 'px-4 py-3 gap-3'">
    <GripVertical :size="compact ? 16 : 18" class="text-icon group-hover:text-fg transition-colors flex-shrink-0" />
    <span class="font-semibold text-fg group-hover:text-fg flex-1 transition-colors" :class="{ 'text-sm': compact }">
      {{ name }}
    </span>
    <button
      v-if="removable"
      @click="$emit('remove')"
      class="opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-danger-dot/10 rounded-lg"
      :title="t('common.remove')">
      <X :size="14" class="text-danger" />
    </button>
  </div>
</template>
