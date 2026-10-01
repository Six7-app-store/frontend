/**
 * A variable whose template restricts it with ``contains([...], var.x)``
 * arrives with ``allowedValues`` and must render as a dropdown, not as
 * free text — a typo would otherwise only surface when Terraform runs.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import VariableInput from '@/components/VariableInput.vue'
import de from '@/i18n/locales/de'
import type { AppVariable } from '@/types'

const i18n = () => createI18n({ legacy: false, locale: 'de', messages: { de } })

const mountInput = (variable: AppVariable, modelValue: unknown) =>
  mount(VariableInput, {
    props: { variable, modelValue },
    global: { plugins: [i18n()], stubs: { OpenStackResourcePicker: true } },
  })

describe('VariableInput mit allowedValues', () => {
  const ipMode: AppVariable = {
    name: 'ip_mode',
    type: 'string',
    default: 'ipv4',
    allowedValues: ['ipv4', 'ipv6', 'dual'],
  }

  it('rendert ein Dropdown mit genau den erlaubten Werten', () => {
    const wrapper = mountInput(ipMode, 'ipv4')

    expect(wrapper.find('input').exists()).toBe(false)
    const options = wrapper.findAll('option').filter((o) => o.attributes('disabled') === undefined)
    expect(options.map((o) => o.text())).toEqual(['ipv4', 'ipv6', 'dual'])
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('0')
  })

  it('gibt den gewählten Wert zurück, nicht den Index', async () => {
    const wrapper = mountInput(ipMode, 'ipv4')

    await wrapper.find('select').setValue('2')

    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual(['dual'])
  })

  it('behält Zahlen als Zahlen', async () => {
    const wrapper = mountInput({ name: 'nodes', type: 'number', allowedValues: [1, 3, 5] }, 3)

    await wrapper.find('select').setValue('2')

    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual([5])
  })

  it('zeigt ohne passenden Wert den Platzhalter', () => {
    const wrapper = mountInput(ipMode, '')

    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('')
  })

  it('lässt den Ressourcen-Picker gewinnen', () => {
    const wrapper = mountInput({ ...ipMode, osType: 'network' }, '')

    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('bleibt ohne allowedValues ein Textfeld', () => {
    const wrapper = mountInput({ name: 'title', type: 'string' }, '')

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })
})
