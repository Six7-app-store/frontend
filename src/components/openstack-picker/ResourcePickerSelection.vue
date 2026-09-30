<script setup lang="ts">
/**
 * What the picker's trigger shows: the placeholder, the selected value as a
 * pill (single) or removable chips (multi). A value missing from the loaded
 * list is marked as external.
 */
import { useI18n } from 'vue-i18n'
import { Check, X } from 'lucide-vue-next'

defineProps<{
  selected: { value: string; displayName: string; known: boolean }[]
  multi?: boolean
  placeholder: string
}>()

defineEmits<{ remove: [value: string] }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5 flex-grow min-w-0">
    <!-- Single -->
    <template v-if="!multi">
      <template v-if="selected.length === 0">
        <span class="text-fg-muted text-sm">{{ placeholder }}</span>
      </template>
      <template v-else>
        <!-- Selection pill: same accent as the highlight row in the
             dropdown, so it reads clearly as a selected value. -->
        <span
          class="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded bg-line/[.07] text-fg border border-strong"
          :title="selected[0]?.value"
        >
          <Check :size="12" class="text-icon flex-shrink-0" />
          <span class="font-medium text-sm truncate">
            {{ selected[0]?.displayName }}
          </span>
        </span>
        <!-- Subtle hint when the value isn't in the currently loaded
             list (e.g. a default UUID of a deleted resource or not-yet
             -loaded items). Shown as a grey, tooltip-capable pill. -->
        <span
          v-if="!selected[0]?.known"
          class="text-xs px-1.5 py-0.5 rounded bg-line/[.07] text-fg-muted border border-subtle"
          :title="t('openstackPicker.notInList')"
        >
          {{ t('openstackPicker.externalBadge') }}
        </span>
      </template>
    </template>

    <!-- Multi: Chips -->
    <template v-else>
      <template v-if="selected.length === 0">
        <span class="text-fg-muted text-sm">{{ placeholder }}</span>
      </template>
      <span
        v-for="(entry, i) in selected"
        :key="i"
        class="inline-flex items-center gap-1 bg-line/[.07] text-fg px-2 py-0.5 rounded text-xs font-medium border border-strong"
        :class="entry.known ? '' : 'border-warning-dot/30 bg-warning-dot/10 text-warning'"
        :title="entry.value"
        @click.stop
      >
        <span class="truncate max-w-[160px]">{{ entry.displayName }}</span>
        <button
          @click.stop="$emit('remove', entry.value)"
          type="button"
          class="hover:text-heading"
        >
          <X :size="12" />
        </button>
      </span>
    </template>
  </div>
</template>
