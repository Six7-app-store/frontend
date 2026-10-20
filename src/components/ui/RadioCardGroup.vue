<script setup lang="ts" generic="V extends string">
/**
 * A radio group whose options are cards, bound to the chosen value with
 * ``v-model``. Each card has a label, optionally a badge next to it, a
 * description and a result line ("1 Umgebung für 9 Personen").
 *
 * Keyboard as in the WAI-ARIA radio group pattern: only the chosen card
 * (or the first one, while nothing is chosen) is in the tab order; arrow
 * keys, Home and End move the choice and the focus.
 *
 * ``stacked`` puts label, description and result below each other (the
 * split options); the default lays the dot beside a two-line text (the
 * app list). The group is named by ``labelledby``.
 */
import { computed, ref } from 'vue'
import Badge from './Badge.vue'
import type { RadioCardOption } from './radio-card'

const props = withDefaults(defineProps<{
  options: RadioCardOption<V>[]
  labelledby: string
  columns?: 1 | 2 | 3
  stacked?: boolean
}>(), {
  columns: 2,
  stacked: false,
})

const chosen = defineModel<V | null>({ required: true })

const cards = ref<HTMLButtonElement[]>([])

const GRID: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
}

const focusIndex = computed(() => {
  const index = props.options.findIndex((o) => o.value === chosen.value)
  return index >= 0 ? index : 0
})

const STEP: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
}

function onKeydown(event: KeyboardEvent, index: number) {
  const step = STEP[event.key]
  if (!step || props.options.length === 0) return
  event.preventDefault()
  const next = step(index, props.options.length)
  chosen.value = props.options[next]!.value
  cards.value[next]?.focus()
}
</script>

<template>
  <div role="radiogroup" :aria-labelledby="labelledby" class="grid gap-3" :class="GRID[columns]">
    <button
      v-for="(option, index) in options"
      :key="option.value"
      ref="cards"
      type="button"
      role="radio"
      class="choice-card"
      :class="{ 'flex-col gap-2.5': stacked }"
      :aria-checked="chosen === option.value"
      :tabindex="index === focusIndex ? 0 : -1"
      :data-testid="`radio-card-${option.value}`"
      @click="chosen = option.value"
      @keydown="onKeydown($event, index)"
    >
      <template v-if="stacked">
        <span class="flex flex-wrap items-center gap-2.5">
          <span class="choice-dot mt-0" aria-hidden="true" />
          <span class="text-md font-semibold">{{ option.label }}</span>
          <Badge v-if="option.badge" data-testid="radio-card-badge">{{ option.badge }}</Badge>
        </span>
        <span v-if="option.description" class="text-sm text-fg-muted">{{ option.description }}</span>
        <span v-if="option.result" class="text-sm text-fg" data-testid="radio-card-result">{{ option.result }}</span>
      </template>
      <template v-else>
        <span class="choice-dot" aria-hidden="true" />
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="flex flex-wrap items-center gap-2">
            <span class="text-md font-semibold">{{ option.label }}</span>
            <Badge v-if="option.badge" data-testid="radio-card-badge">{{ option.badge }}</Badge>
          </span>
          <span v-if="option.description" class="truncate text-sm text-fg-muted">{{ option.description }}</span>
          <span v-if="option.result" class="text-sm text-fg" data-testid="radio-card-result">{{ option.result }}</span>
        </span>
      </template>
    </button>
  </div>
</template>
