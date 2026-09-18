/**
 * Confirmation dialogs of the deployment detail page: the deployment name
 * is user input and must be rendered as text, never as HTML.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import DeploymentDeleteModal from '@/components/deployment/DeploymentDeleteModal.vue'
import DeploymentPauseResumeModal from '@/components/deployment/DeploymentPauseResumeModal.vue'
import de from '@/i18n/locales/de'

const EVIL_NAME = '<img src=x onerror="alert(1)">'

const i18n = () => createI18n({ legacy: false, locale: 'de', messages: { de } })

describe('Deployment-Bestätigungsdialoge', () => {
  it('rendert den Deployment-Namen im Löschen-Dialog als Text', () => {
    const wrapper = mount(DeploymentDeleteModal, {
      props: { show: true, deploymentName: EVIL_NAME },
      global: { plugins: [i18n()] },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('strong').text()).toBe(EVIL_NAME)
    expect(wrapper.text()).toContain('löschen?')
  })

  it.each(['pause', 'resume'] as const)('rendert den Deployment-Namen im %s-Dialog als Text', (action) => {
    const wrapper = mount(DeploymentPauseResumeModal, {
      props: { show: true, action, deploymentName: EVIL_NAME, busy: false },
      global: { plugins: [i18n()] },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('strong').text()).toBe(EVIL_NAME)
    expect(wrapper.text()).toContain(action === 'pause' ? 'pausieren?' : 'fortsetzen?')
  })
})
