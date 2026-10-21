import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import WizardStepper from '@/components/deployment-wizard/WizardStepper.vue'
import de from '@/i18n/locales/de'

const mountStepper = (current: number) => mount(WizardStepper, {
  props: { labels: ['App', 'Für wen?', 'Aufgabe & Start'], current },
  global: { plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })] },
})

describe('WizardStepper', () => {
  it('zeigt „Schritt x von y“ und markiert genau den aktuellen Schritt', () => {
    const wrapper = mountStepper(1)
    const steps = wrapper.findAll('[data-testid="wizard-step"]')

    expect(wrapper.get('[data-testid="wizard-step-count"]').text()).toBe('Schritt 2 von 3')
    expect(steps.map((s) => s.attributes('aria-current'))).toEqual([undefined, 'step', undefined])
    expect(wrapper.get('ol').attributes('aria-label')).toBe('Fortschritt')
  })

  it('nennt erledigte Schritte für Screenreader', () => {
    const steps = mountStepper(2).findAll('[data-testid="wizard-step"]')
    expect(steps[0]!.text()).toContain('erledigt')
    expect(steps[2]!.text()).not.toContain('erledigt')
  })
})
