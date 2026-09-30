import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Globe } from 'lucide-vue-next'

import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const options = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN', icon: Globe },
]

describe('SegmentedControl', () => {
  it('bildet eine benannte Gruppe und markiert die Auswahl', () => {
    const wrapper = mount(SegmentedControl, { props: { options, modelValue: 'de', ariaLabel: 'Sprache' } })
    const [de, en] = wrapper.findAll('button')

    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('Sprache')
    expect(de!.attributes('aria-pressed')).toBe('true')
    expect(en!.attributes('aria-pressed')).toBe('false')
    expect(de!.attributes('type')).toBe('button')
  })

  it('meldet die neue Auswahl per v-model', async () => {
    const wrapper = mount(SegmentedControl, { props: { options, modelValue: 'de', ariaLabel: 'Sprache' } })

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['en']])
  })

  it('zeigt optionale Icons und die mittlere Größe', () => {
    const wrapper = mount(SegmentedControl, { props: { options, modelValue: 'de', ariaLabel: 'x', size: 'md' } })

    expect(wrapper.findAll('svg')).toHaveLength(1)
    expect(wrapper.classes()).toContain('segment-md')
  })
})
