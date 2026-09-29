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
