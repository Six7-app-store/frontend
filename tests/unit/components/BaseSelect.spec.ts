import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseSelect from '@/components/ui/BaseSelect.vue'

const options = [
  { value: 'v1', label: 'Version 1' },
  { value: 'v2', label: 'Version 2', disabled: true },
]

describe('BaseSelect', () => {
  it('rendert die Optionen und wählt den Wert aus v-model', () => {
    const wrapper = mount(BaseSelect, { props: { options, modelValue: 'v1' } })
    const select = wrapper.get('select')

    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['Version 1', 'Version 2'])
    expect((select.element as HTMLSelectElement).value).toBe('v1')
    expect(wrapper.findAll('option')[1]!.attributes('disabled')).toBeDefined()
  })

  it('meldet die Auswahl per v-model', async () => {
    const wrapper = mount(BaseSelect, { props: { options, modelValue: 'v1' } })

    await wrapper.get('select').setValue('v2')

    expect(wrapper.emitted('update:modelValue')).toEqual([['v2']])
  })

  it('zeigt einen nicht wählbaren Platzhalter, solange nichts gewählt ist', () => {
    const wrapper = mount(BaseSelect, { props: { options, modelValue: '', placeholder: 'Version wählen' } })
    const placeholder = wrapper.findAll('option')[0]!

    expect(placeholder.text()).toBe('Version wählen')
    expect(placeholder.attributes('disabled')).toBeDefined()
  })

  it('reicht id, disabled und aria an das select, die Klasse an den Rahmen', () => {
    const wrapper = mount(BaseSelect, {
      props: { options, modelValue: 'v1' },
      attrs: { id: 'version', disabled: true, 'aria-describedby': 'hint', class: 'w-56' },
    })
    const select = wrapper.get('select')

    expect(select.attributes('id')).toBe('version')
    expect(select.attributes('disabled')).toBeDefined()
    expect(select.attributes('aria-describedby')).toBe('hint')
    expect(select.classes()).not.toContain('w-56')
    expect(wrapper.classes()).toContain('w-56')
  })
})
