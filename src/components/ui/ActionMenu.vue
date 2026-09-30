<script setup lang="ts">
/**
 * The "…" menu for the less common actions of a row or page. Opens below its
 * trigger, is reachable by keyboard (arrow keys, Home/End, Esc) and closes
 * when focus or a click leaves it. Destructive entries (``danger``) stay grey
 * until hovered; the caller asks for confirmation after ``select``.
 */
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'
import type { MenuItem } from './menu'

defineProps<{
  items: MenuItem[]
  /** Accessible name of the trigger button. */
  label: string
}>()

const emit = defineEmits<{ select: [id: string] }>()

const open = ref(false)
const trigger = ref<InstanceType<typeof BaseButton> | null>(null)
const menu = ref<HTMLElement | null>(null)
const position = ref({ top: '0px', right: '0px' })

function triggerElement(): HTMLElement | null {
  return (trigger.value?.$el as HTMLElement | undefined) ?? null
}

function entries(): HTMLElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
}

function onOutsidePointer(event: Event) {
  const target = event.target as Node
  if (!menu.value?.contains(target) && !triggerElement()?.contains(target)) close()
}

async function show() {
  const rect = triggerElement()?.getBoundingClientRect()
  if (rect) {
    position.value = {
      top: `${rect.bottom + 4}px`,
      right: `${window.innerWidth - rect.right}px`,
    }
  }
  open.value = true
  document.addEventListener('pointerdown', onOutsidePointer)
  window.addEventListener('resize', close)
  window.addEventListener('scroll', close, true)
  await nextTick()
  entries()[0]?.focus()
}

function close() {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', onOutsidePointer)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', close, true)
}

function closeAndFocusTrigger() {
  close()
  triggerElement()?.focus()
}

function toggle() {
  if (open.value) close()
  else void show()
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' && !open.value) {
    event.preventDefault()
    void show()
  }
}

function onMenuKeydown(event: KeyboardEvent) {
  const all = entries()
  const index = all.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'Escape') {
    event.preventDefault()
    closeAndFocusTrigger()
  } else if (event.key === 'Tab') {
    close()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    all[(index + 1) % all.length]?.focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    all[(index - 1 + all.length) % all.length]?.focus()
  } else if (event.key === 'Home') {
    event.preventDefault()
    all[0]?.focus()
  } else if (event.key === 'End') {
    event.preventDefault()
    all[all.length - 1]?.focus()
  }
}

function choose(id: string) {
  closeAndFocusTrigger()
  emit('select', id)
}

onBeforeUnmount(() => close())
</script>

<template>
  <span class="inline-flex">
  <BaseButton
    ref="trigger"
    variant="ghost"
    icon
    :label="label"
    aria-haspopup="menu"
    :aria-expanded="open"
    @click="toggle"
    @keydown="onTriggerKeydown"
  >
    <MoreHorizontal :size="16" aria-hidden="true" />
  </BaseButton>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      role="menu"
      :aria-label="label"
      class="surface-overlay fixed z-50 min-w-[12rem] p-1"
      :style="position"
      @keydown="onMenuKeydown"
    >
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        role="menuitem"
        class="menu-entry"
        :class="{ 'menu-entry-danger': item.danger }"
        :disabled="item.disabled"
        @click="choose(item.id)"
      >
        <component :is="item.icon" v-if="item.icon" :size="15" aria-hidden="true" />
        {{ item.label }}
      </button>
    </div>
  </Teleport>
  </span>
</template>
