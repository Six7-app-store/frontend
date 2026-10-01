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
    class="group flex cursor-move items-center rounded-control border border-subtle bg-panel transition-colors hover:border-strong"
    :class="compact ? 'gap-2 px-3 py-2' : 'gap-3 px-3 py-2.5'">
    <GripVertical :size="compact ? 14 : 16" class="shrink-0 text-icon" aria-hidden="true" />
    <span class="flex-1 text-fg" :class="compact ? 'text-sm' : 'text-base'">
      {{ name }}
    </span>
    <button
      v-if="removable"
      type="button"
      class="btn btn-danger btn-icon h-[26px] w-[26px] opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      :title="t('common.remove')"
      :aria-label="t('common.remove')"
      @click="$emit('remove')">
      <X :size="14" aria-hidden="true" />
    </button>
  </div>
</template>
