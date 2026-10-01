import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import TabBar from '@/components/ui/TabBar.vue'

const tabs = [
  { key: 'app', label: 'App-Credential' },
  { key: 'password', label: 'Passwort' },
]

describe('TabBar', () => {
  it('markiert den aktiven Tab und wechselt per Klick', async () => {
    const wrapper = mount(TabBar, { props: { tabs, modelValue: 'app' } })
    const [app, password] = wrapper.findAll('[role="tab"]')

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
    expect(app!.attributes('aria-selected')).toBe('true')
    expect(app!.classes()).toContain('border-accent')
    expect(password!.attributes('aria-selected')).toBe('false')

    await password!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['password']])
  })

  it('lässt nur den aktiven Tab in der Tab-Reihenfolge und wechselt mit Pfeil-, Pos1- und Ende-Taste', async () => {
    const three = [...tabs, { key: 'third', label: 'Dritter' }]
    const wrapper = mount(TabBar, { props: { tabs: three, modelValue: 'app' }, attachTo: document.body })
    const [app, password, third] = wrapper.findAll('[role="tab"]')

    expect(app!.attributes('tabindex')).toBe('0')
    expect(password!.attributes('tabindex')).toBe('-1')

    await app!.trigger('keydown', { key: 'End' })
    await third!.trigger('keydown', { key: 'Home' })
    await app!.trigger('keydown', { key: 'ArrowRight' })
    await app!.trigger('keydown', { key: 'ArrowLeft' })
    await app!.trigger('keydown', { key: 'a' })

    // ArrowLeft on the first tab wraps around to the last.
    expect(wrapper.emitted('update:modelValue')).toEqual([['third'], ['app'], ['password'], ['third']])
    expect(document.activeElement).toBe(third!.element)
    wrapper.unmount()
  })

  it('verknüpft Tabs und Panels über idPrefix', () => {
    const wrapper = mount(TabBar, { props: { tabs, modelValue: 'app', idPrefix: 'x' } })
    const [app] = wrapper.findAll('[role="tab"]')

    expect(app!.attributes('id')).toBe('x-tab-app')
    expect(app!.attributes('aria-controls')).toBe('x-panel-app')
  })

  it('setzt ohne idPrefix weder id noch aria-controls', () => {
    const wrapper = mount(TabBar, { props: { tabs, modelValue: 'app' } })
    const [app] = wrapper.findAll('[role="tab"]')

    expect(app!.attributes('id')).toBeUndefined()
    expect(app!.attributes('aria-controls')).toBeUndefined()
  })

  it('zeigt Zusätze aus dem extra-Slot und kann die Breite füllen', () => {
    const wrapper = mount(TabBar, {
      props: { tabs, modelValue: 'app', fill: true },
      slots: { extra: `<template #extra="{ tab }"><em v-if="tab.label === 'App-Credential'">empfohlen</em></template>` },
    })
    const [app, password] = wrapper.findAll('[role="tab"]')

    expect(app!.text()).toContain('empfohlen')
    expect(password!.text()).not.toContain('empfohlen')
    expect(app!.classes()).toContain('flex-1')
  })
})
