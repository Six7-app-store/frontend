/**
 * The tabs of the app detail page on their own: what each shows from the
 * data it gets, and what it asks the page to do.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import AppConfigTab from '@/components/app/AppConfigTab.vue'
import AppDocsTab from '@/components/app/AppDocsTab.vue'
import AppSettingsTab from '@/components/app/AppSettingsTab.vue'
import AppVersionsTab from '@/components/app/AppVersionsTab.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const global = {
  mocks: { $t: (key: string) => key },
  stubs: { MarkdownRenderer: { props: ['source'], template: '<div>{{ source }}</div>' } },
}

describe('AppDocsTab', () => {
  it('baut "Auf dieser Seite" aus den Abschnitten der Beschreibung', () => {
    const wrapper = mount(AppDocsTab, {
      props: { description: '# Titel\n\nText\n\n## Erster\n\n### Unter\n\n## Zweiter' },
      global,
    })

    const links = wrapper.findAll('nav a').map((a) => a.text())
    expect(links).toEqual(['Erster', 'Zweiter'])
  })

  it('lässt "Auf dieser Seite" ohne Abschnitte weg', () => {
    const wrapper = mount(AppDocsTab, { props: { description: 'Nur Text.' }, global })
    expect(wrapper.find('nav').exists()).toBe(false)
  })
})

describe('AppConfigTab', () => {
  it('zeigt beim Laden nur den Hinweis darauf', () => {
    const wrapper = mount(AppConfigTab, { props: { variables: [], version: 'v1', loading: true }, global })

    expect(wrapper.text()).toContain('AppsDetailView.config.loading')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('nennt "Default vorhanden" nur bei einem Default und lässt leere Beschreibungen leer', () => {
    const wrapper = mount(AppConfigTab, {
      props: {
        version: 'v1',
        loading: false,
        variables: [
          { name: 'flavor', type: 'string', description: '@openstack:flavor:name', required: false, default: 'm1' },
          { name: 'files', type: 'string', required: true, default: null },
        ],
      },
      global,
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]!.text()).toBe('flavorAppsDetailView.noAppsDetailView.config.defaultPresent')
    expect(rows[1]!.text()).toBe('filesAppsDetailView.yes')
  })
})

describe('AppVersionsTab', () => {
  const base = {
    versions: ['v2', 'v1'],
    approvalByVersion: {},
    bannerStatus: 'none' as const,
    canEdit: true,
    isPrivate: false,
    withdrawingVersion: null,
  }

  it('lässt bei einer Ablehnung ohne Grund die Grund-Zeile weg', () => {
    const wrapper = mount(AppVersionsTab, {
      props: {
        ...base,
        approvalByVersion: { v2: { version_tag: 'v2', status: 'rejected', rejection_reason: null, created_at: '2026-01-02T00:00:00Z' } as any },
      },
      global,
    })

    expect(wrapper.text()).not.toContain('AppsDetailView.rejectionReasonLabel')
    expect(wrapper.text()).toContain('AppsDetailView.resubmitButton')
  })

  it('reicht die gewählte Version ein', async () => {
    const wrapper = mount(AppVersionsTab, { props: base, global })

    const buttons = wrapper.findAll('button').filter((b) => b.text().includes('AppsDetailView.submitButton'))
    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('submit')).toEqual([['v1']])
  })

  it('zeigt ohne Bearbeitungsrecht nur die Versionen', () => {
    const wrapper = mount(AppVersionsTab, { props: { ...base, canEdit: false, bannerStatus: 'no_submission' }, global })

    expect(wrapper.findAll('th')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('AppsDetailView.bannerNoSubmission')
  })
})

describe('AppSettingsTab', () => {
  const app = { name: 'Demo', is_private: true }

  it('fragt Sichtbarkeit, Bearbeiten und Löschen bei der Seite an', async () => {
    const wrapper = mount(AppSettingsTab, { props: { app, togglingPrivacy: false }, global })

    await wrapper.get('[role="switch"]').trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'AppsDetailView.editApp')!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'AppsDetailView.deleteZoneButton')!.trigger('click')

    expect(wrapper.emitted('togglePrivacy')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.text()).toContain('AppsDetailView.visibilityPrivateDesc')
  })
})
