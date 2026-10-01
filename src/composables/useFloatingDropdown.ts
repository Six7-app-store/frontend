import { nextTick, onBeforeUnmount, ref, type Ref } from 'vue'

// Tailwind ``max-h-96``: the panel's height when there is room for it.
const PANEL_MAX_H = 384
const GAP = 4

/**
 * A dropdown panel teleported to ``body`` and pinned to its trigger with
 * ``position: fixed``. It opens below the trigger, or above when there is
 * more room there; it follows scrolling (also inside overflow containers)
 * and resizing, and closes when the trigger scrolls out of view, on a
 * click outside trigger and panel, and on Escape.
 *
 * Listeners exist only while the panel is open and are removed on
 * unmount, so a panel left open does not leak them.
 */
export function useFloatingDropdown(
  triggerEl: Ref<HTMLElement | null>,
  panelEl: Ref<HTMLElement | null>,
  hooks: { onOpen?: () => void; onClose?: () => void } = {},
) {
  const isOpen = ref(false)
  const popupStyle = ref<Record<string, string>>({})

  function recalcPosition() {
    const trigger = triggerEl.value
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportH = window.innerHeight
    // Without a visible anchor the panel would hang in mid-air.
    if (rect.bottom < 0 || rect.top > viewportH) {
      close()
      return
    }
    const spaceBelow = viewportH - rect.bottom
    const spaceAbove = rect.top
    const flipUp = spaceBelow < PANEL_MAX_H && spaceAbove > spaceBelow
    popupStyle.value = {
      position: 'fixed',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      ...(flipUp
        ? { bottom: `${viewportH - rect.top + GAP}px`, maxHeight: `${Math.max(spaceAbove - GAP - 8, 200)}px` }
        : { top: `${rect.bottom + GAP}px`, maxHeight: `${Math.max(spaceBelow - GAP - 8, 200)}px` }),
      zIndex: '60',
    }
  }

  function onDocumentMouseDown(ev: MouseEvent) {
    const target = ev.target as Node | null
    if (!target) return
    if (triggerEl.value?.contains(target)) return
    if (panelEl.value?.contains(target)) return
    close()
  }

  function onKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') close()
  }

  function open() {
    isOpen.value = true
    // Position once the panel is in the DOM.
    nextTick(() => {
      recalcPosition()
      hooks.onOpen?.()
    })
    // ``capture`` so scrolling inside overflow containers is seen too.
    window.addEventListener('scroll', recalcPosition, true)
    window.addEventListener('resize', recalcPosition)
    document.addEventListener('mousedown', onDocumentMouseDown)
    document.addEventListener('keydown', onKeydown)
  }

  function close() {
    if (!isOpen.value) return
    isOpen.value = false
    window.removeEventListener('scroll', recalcPosition, true)
    window.removeEventListener('resize', recalcPosition)
    document.removeEventListener('mousedown', onDocumentMouseDown)
    document.removeEventListener('keydown', onKeydown)
    hooks.onClose?.()
  }

  function toggle() {
    if (isOpen.value) close()
    else open()
  }

  onBeforeUnmount(close)

  return { isOpen, popupStyle, open, close, toggle }
}
