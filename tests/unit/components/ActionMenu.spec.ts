import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

import ActionMenu from '@/components/ui/ActionMenu.vue'
import type { MenuItem } from '@/components/ui/menu'

const items: MenuItem[] = [
  { id: 'edit', label: 'Bearbeiten' },
  { id: 'export', label: 'Exportieren', disabled: true },
  { id: 'delete', label: 'Löschen', danger: true },
]

let wrapper: VueWrapper | undefined

function mountMenu() {
  wrapper = mount(ActionMenu, {
    props: { items, label: 'Weitere Aktionen' },
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })
  return wrapper
}

const menuEntries = (w: VueWrapper) => w.findAll('[role="menuitem"]')

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('ActionMenu', () => {
  it('zeigt nur den benannten Auslöser, solange es geschlossen ist', () => {
    const w = mountMenu()
    const trigger = w.get('button')

    expect(trigger.attributes('aria-label')).toBe('Weitere Aktionen')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(w.find('[role="menu"]').exists()).toBe(false)
  })

  it('öffnet per Klick, fokussiert den ersten aktiven Eintrag und markiert Gefährliches', async () => {
    const w = mountMenu()

    await w.get('button').trigger('click')
    await nextTick()

    expect(w.get('button').attributes('aria-expanded')).toBe('true')
    expect(menuEntries(w).map((entry) => entry.text())).toEqual(['Bearbeiten', 'Exportieren', 'Löschen'])
    expect(document.activeElement?.textContent).toContain('Bearbeiten')
    expect(menuEntries(w)[2]!.classes()).toContain('menu-entry-danger')
    expect(menuEntries(w)[1]!.attributes('disabled')).toBeDefined()
  })

  it('öffnet mit Pfeil nach unten am Auslöser', async () => {
    const w = mountMenu()

    await w.get('button').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()

    expect(w.find('[role="menu"]').exists()).toBe(true)
  })

  it('wandert mit den Pfeiltasten durch aktive Einträge und überspringt deaktivierte', async () => {
    const w = mountMenu()
    await w.get('button').trigger('click')
    await nextTick()
    const menu = w.get('[role="menu"]')

    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Löschen')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Bearbeiten')
    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement?.textContent).toContain('Löschen')
    await menu.trigger('keydown', { key: 'Home' })
    expect(document.activeElement?.textContent).toContain('Bearbeiten')
    await menu.trigger('keydown', { key: 'End' })
    expect(document.activeElement?.textContent).toContain('Löschen')
  })

  it('schließt mit Escape und gibt den Fokus an den Auslöser zurück', async () => {
    const w = mountMenu()
    await w.get('button').trigger('click')
    await nextTick()

    await w.get('[role="menu"]').trigger('keydown', { key: 'Escape' })

    expect(w.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(w.get('button').element)
  })

  it('meldet die Wahl, schließt und fokussiert den Auslöser', async () => {
    const w = mountMenu()
    await w.get('button').trigger('click')
    await nextTick()

    await menuEntries(w)[2]!.trigger('click')

    expect(w.emitted('select')).toEqual([['delete']])
    expect(w.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(w.get('button').element)
  })

  it('schließt bei Klick neben das Menü', async () => {
    const w = mountMenu()
    await w.get('button').trigger('click')
    await nextTick()

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()

    expect(w.find('[role="menu"]').exists()).toBe(false)
  })

  it('schließt, wenn der Fokus per Tab weiterwandert', async () => {
    const w = mountMenu()
    await w.get('button').trigger('click')
    await nextTick()

    await w.get('[role="menu"]').trigger('keydown', { key: 'Tab' })

    expect(w.find('[role="menu"]').exists()).toBe(false)
  })
})
