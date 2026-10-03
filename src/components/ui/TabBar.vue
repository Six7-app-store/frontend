<script setup lang="ts" generic="K extends string">
/**
 * Underlined tab row bound to the active tab's key with ``v-model``. The
 * ``extra`` slot adds something after a tab's label (a hint dot, a
 * "recommended" note); ``fill`` stretches the tabs across the full width.
 *
 * Keyboard as in the WAI-ARIA tabs pattern: only the active tab is in the
 * tab order, arrow keys, Home and End move between tabs. With ``idPrefix``
 * every tab gets an id and points at its panel via ``aria-controls``; the
 * page gives the panel ``panelId(idPrefix, key)`` and ``aria-labelledby``
 * ``tabId(idPrefix, key)`` (both from ``./tab``).
 */
import { ref } from 'vue'
import { panelId, tabId, type Tab } from './tab'

const props = withDefaults(defineProps<{
  tabs: Tab<K>[]
  fill?: boolean
  idPrefix?: string
}>(), {
  fill: false,
  idPrefix: undefined,
})

const active = defineModel<K>({ required: true })

defineSlots<{
  extra?: (props: { tab: Tab<K> }) => unknown
}>()

const buttons = ref<HTMLButtonElement[]>([])

const STEP: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
}

function onKeydown(event: KeyboardEvent, index: number) {
  const step = STEP[event.key]
  if (!step) return
  event.preventDefault()
  const next = step(index, props.tabs.length)
  active.value = props.tabs[next]!.key
  buttons.value[next]?.focus()
}
</script>

<template>
  <div role="tablist" class="flex border-b border-subtle" :class="{ 'gap-7': !fill }">
    <button
      v-for="(tab, index) in tabs"
      :id="idPrefix ? tabId(idPrefix, tab.key) : undefined"
      :key="tab.key"
      ref="buttons"
      type="button"
      role="tab"
      :aria-selected="active === tab.key"
      :aria-controls="idPrefix ? panelId(idPrefix, tab.key) : undefined"
      :tabindex="active === tab.key ? 0 : -1"
      class="-mb-px flex h-10 items-center justify-center gap-2 border-b-2 text-base transition-colors"
      :class="[
        active === tab.key
          ? 'border-accent font-semibold text-heading'
          : 'border-transparent text-fg-muted hover:text-fg',
        fill ? 'flex-1 px-4' : '',
      ]"
      @click="active = tab.key"
      @keydown="onKeydown($event, index)"
    >
      <component :is="tab.icon" v-if="tab.icon" :size="16" />
      {{ tab.label }}
      <slot name="extra" :tab="tab" />
    </button>
  </div>
</template>
