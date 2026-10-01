import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import MeterBar from '@/components/ui/MeterBar.vue'

describe('MeterBar', () => {
  it('meldet Wert und Bezeichnung als meter', () => {
    const wrapper = mount(MeterBar, { props: { value: 31, label: 'CPU-Kerne' } })

    expect(wrapper.attributes('role')).toBe('meter')
    expect(wrapper.attributes('aria-label')).toBe('CPU-Kerne')
    expect(wrapper.attributes('aria-valuenow')).toBe('31')
  })

  it('füllt grün unter 50 % und gelb ab 50 %', () => {
    const low = mount(MeterBar, { props: { value: 49, label: 'x' } })
    const mid = mount(MeterBar, { props: { value: 50, label: 'x' } })

    expect(low.get('.h-full').classes()).toContain('meter-fill-low')
    expect(mid.get('.h-full').classes()).toContain('meter-fill-mid')
  })

  it('setzt die Füllbreite auf den begrenzten Prozentwert', () => {
    const wrapper = mount(MeterBar, { props: { value: 140, label: 'x' } })

    expect(wrapper.get('.h-full').attributes('style')).toContain('width: 100%')
    expect(wrapper.attributes('aria-valuenow')).toBe('100')
  })
})
