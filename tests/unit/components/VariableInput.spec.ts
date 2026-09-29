import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import VariableInput from '@/components/VariableInput.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const boolVariable = { name: 'enable_gpu', type: 'bool', source: 'terraform' } as never

const mountInput = (props: Record<string, unknown>) =>
  mount(VariableInput, {
    props: { variable: boolVariable, modelValue: false, ...props },
    global: { stubs: { OpenStackResourcePicker: true } },
  })

describe('VariableInput bool', () => {
  it('schaltet einen Bool-Wert um und zeigt An/Aus', async () => {
    const wrapper = mountInput({ modelValue: false })
    expect(wrapper.text()).toContain('variableInput.off')

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])

    await wrapper.setProps({ modelValue: true })
    expect(wrapper.text()).toContain('variableInput.on')
  })

  it('lässt sich deaktivieren', () => {
    const wrapper = mountInput({ disabled: true })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
