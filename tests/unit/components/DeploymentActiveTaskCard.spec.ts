import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import DeploymentActiveTaskCard from '@/components/deployment/DeploymentActiveTaskCard.vue'
import de from '@/i18n/locales/de'
import type { LiveTaskView } from '@/composables/useDeploymentLiveStream'
import type { Task } from '@/types'

const live = (over: Partial<LiveTaskView> = {}): LiveTaskView => ({
  connectionState: 'live',
  phaseIndex: 2,
  phase: 'TOFU_PLAN',
  progress: 38,
  stepCount: 3,
  stepLabel: (i) => `Phase ${i + 1}`,
  activeStepIndex: 1,
  logs: [{ timestamp: '2026-10-20T14:12:00Z', level: 'INFO', message: 'tofu plan' } as never],
  totalLogCount: 1,
  ...over,
})

const mountCard = (type: Task['type']) => mount(DeploymentActiveTaskCard, {
  props: { activeTask: { taskId: 't1', type, created_at: '2026-10-20T14:12:00Z' } as Task, live: live() },
  global: { plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })] },
})

describe('DeploymentActiveTaskCard', () => {
  it('sagt, dass die Seite geschlossen werden kann, und beim Deploy, dass eine Mail kommt', () => {
    expect(mountCard('deploy').get('[data-testid="close-note"]').text()).toContain('E-Mail mit den Zugangsdaten')
    const destroy = mountCard('destroy').get('[data-testid="close-note"]').text()
    expect(destroy).toContain('Du kannst diese Seite schließen')
    expect(destroy).not.toContain('E-Mail')
  })

  it('klappt das Live-Log erst auf Wunsch auf', async () => {
    const wrapper = mountCard('deploy')
    const toggle = wrapper.get('[data-testid="btn-live-log"]')
    const log = wrapper.get('[data-testid="live-log"]')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe(log.attributes('id'))
    expect(log.attributes('style')).toContain('display: none')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.text()).toBe('Live-Log ausblenden')
    expect(log.attributes('style') ?? '').not.toContain('display: none')
    expect(log.text()).toContain('tofu plan')
  })
})
