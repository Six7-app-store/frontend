import { describe, it, expect, afterEach } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'

import RadioCardGroup from '@/components/ui/RadioCardGroup.vue'

enableAutoUnmount(afterEach)

const options = [
  { value: 'one', label: 'Alle zusammen', badge: 'Empfohlen', result: '1 Umgebung' },
  { value: 'each', label: 'Jeder einzeln', description: 'Jede Person eine eigene' },
  { value: 'custom', label: 'Gruppen selbst bilden' },
]

/** Mounted with a working ``v-model``: an update is fed back as the new value. */
async function mountGroup(modelValue: string | null) {
  const wrapper = mount(RadioCardGroup, { props: { options, labelledby: 'frage', modelValue }, attachTo: document.body })
  await wrapper.setProps({ 'onUpdate:modelValue': (v: string | null) => wrapper.setProps({ modelValue: v }) })
  return wrapper
}

describe('RadioCardGroup', () => {
  it('ist eine benannte Radiogruppe und markiert die Wahl mit aria-checked', async () => {
    const wrapper = await mountGroup('each')
    const radios = wrapper.findAll('[role="radio"]')

    expect(wrapper.get('[role="radiogroup"]').attributes('aria-labelledby')).toBe('frage')
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(radios.map((r) => r.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
  })

  it('zeigt Badge, Beschreibung und Ergebnis', async () => {
    const wrapper = await mountGroup(null)
    expect(wrapper.get('[data-testid="radio-card-badge"]').text()).toBe('Empfohlen')
    expect(wrapper.get('[data-testid="radio-card-result"]').text()).toBe('1 Umgebung')
    expect(wrapper.text()).toContain('Jede Person eine eigene')
  })

  it('lässt ohne Wahl die erste Karte in der Tab-Reihenfolge und wählt per Klick', async () => {
    const wrapper = await mountGroup(null)
    expect(wrapper.findAll('[role="radio"]')[0]!.attributes('tabindex')).toBe('0')

    await wrapper.get('[data-testid="radio-card-custom"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['custom']])
  })

  it('wechselt mit Pfeiltasten, Pos1 und Ende Wahl und Fokus', async () => {
    const wrapper = await mountGroup('one')
    const radio = (i: number) => wrapper.findAll('[role="radio"]')[i]!

    await radio(0).trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.props('modelValue')).toBe('each')
    expect(document.activeElement).toBe(radio(1).element)

    await radio(1).trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.props('modelValue')).toBe('one')

    await radio(0).trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.props('modelValue')).toBe('custom')

    await radio(2).trigger('keydown', { key: 'Home' })
    expect(wrapper.props('modelValue')).toBe('one')
    await radio(0).trigger('keydown', { key: 'End' })
    expect(wrapper.props('modelValue')).toBe('custom')

    await radio(2).trigger('keydown', { key: 'a' })
    expect(wrapper.props('modelValue')).toBe('custom')
  })

  it('stapelt Inhalt untereinander, wenn gewünscht', () => {
    const wrapper = mount(RadioCardGroup, { props: { options, labelledby: 'f', modelValue: 'one', stacked: true, columns: 3 } })
    expect(wrapper.get('[data-testid="radio-card-result"]').text()).toBe('1 Umgebung')
  })
})
