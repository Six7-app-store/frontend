import { describe, it, expect } from 'vitest'

import { buildBreadcrumbs } from '@/services/breadcrumb.service'
import { ROUTE_NAMES } from '@/router/route-names'
import de from '@/i18n/locales/de'

// Resolves "a.b.c" against the German messages, like ``t`` would.
const t = (key: string): string =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], de) as string

const crumbs = (routeName: string | null | undefined, extra: { entityLabel?: string | null; isStudent?: boolean } = {}) =>
  buildBreadcrumbs({ routeName, isStudent: false, t, ...extra })

const last = <T>(items: T[]): T | undefined => items[items.length - 1]

describe('buildBreadcrumbs', () => {
  it('zeigt auf Übersichtsseiten nur die aktuelle Seite ohne Link', () => {
    expect(crumbs(ROUTE_NAMES.apps)).toEqual([{ label: 'Apps' }])
    expect(crumbs(ROUTE_NAMES.courses)).toEqual([{ label: 'Kurse' }])
    expect(crumbs(ROUTE_NAMES.home)).toEqual([{ label: 'Dashboard' }])
    expect(crumbs(ROUTE_NAMES.dashboard)).toEqual([{ label: 'Dashboard' }])
    expect(crumbs(ROUTE_NAMES.help)).toEqual([{ label: 'Hilfe' }])
  })

  it('hängt auf Detailseiten den Namen der Entität an die verlinkte Übersicht', () => {
    expect(crumbs(ROUTE_NAMES.appsDetail, { entityLabel: 'Online-IDE' })).toEqual([
      { label: 'Apps', to: { name: ROUTE_NAMES.apps } },
      { label: 'Online-IDE' },
    ])
    expect(crumbs(ROUTE_NAMES.coursesDetail, { entityLabel: 'WI SE B 23' })).toEqual([
      { label: 'Kurse', to: { name: ROUTE_NAMES.courses } },
      { label: 'WI SE B 23' },
    ])
    expect(crumbs(ROUTE_NAMES.deploymentsDetail, { entityLabel: 'Praktikum 1' })).toEqual([
      { label: 'Deployments', to: { name: ROUTE_NAMES.deploymentsList } },
      { label: 'Praktikum 1' },
    ])
  })

  it('hält einen Platzhalter, solange der Name noch lädt', () => {
    expect(last(crumbs(ROUTE_NAMES.appsDetail))).toEqual({ label: '…' })
    expect(last(crumbs(ROUTE_NAMES.appsDetail, { entityLabel: '   ' }))).toEqual({ label: '…' })
    expect(last(crumbs(ROUTE_NAMES.appsDetail, { entityLabel: null }))).toEqual({ label: '…' })
  })

  it('führt „App hinzufügen“ unter Apps', () => {
    expect(crumbs(ROUTE_NAMES.appsCreate)).toEqual([
      { label: 'Apps', to: { name: ROUTE_NAMES.apps } },
      { label: 'App hinzufügen' },
    ])
  })

  it.each([
    ROUTE_NAMES.deploymentConfig,
    ROUTE_NAMES.deploymentTeams,
    ROUTE_NAMES.deploymentVariables,
    ROUTE_NAMES.deploymentSummary,
  ])('ordnet den Wizard-Schritt %s unter Deployments ein', (name) => {
    expect(crumbs(name)).toEqual([
      { label: 'Deployments', to: { name: ROUTE_NAMES.deploymentsList } },
      { label: 'Neues Deployment' },
    ])
  })

  it('nennt den Bereich für Studierende „Umgebungen“', () => {
    expect(crumbs(ROUTE_NAMES.deploymentsList, { isStudent: true })).toEqual([{ label: 'Umgebungen' }])
    expect(crumbs(ROUTE_NAMES.deploymentsDetail, { isStudent: true, entityLabel: 'Lab' })[0]).toMatchObject({ label: 'Umgebungen' })
  })

  it('setzt Freigaben unter die Gruppe „Verwaltung“', () => {
    expect(crumbs(ROUTE_NAMES.adminApps)).toEqual([{ label: 'Verwaltung' }, { label: 'Freigaben' }])
  })

  it('führt die Profil-Unterseite unter Profil', () => {
    expect(crumbs(ROUTE_NAMES.user)).toEqual([{ label: 'Profil' }])
    expect(crumbs(ROUTE_NAMES.userOpenStack)).toEqual([
      { label: 'Profil', to: { name: ROUTE_NAMES.user } },
      { label: de.SettingsOpenStackView.title },
    ])
  })

  it('kennt die Fehlerseiten und sonst keine Spur', () => {
    expect(crumbs(ROUTE_NAMES.forbidden)).toEqual([{ label: 'Zugriff verweigert' }])
    expect(crumbs(ROUTE_NAMES.notFound)).toEqual([{ label: 'Seite nicht gefunden' }])
    expect(crumbs(ROUTE_NAMES.login)).toEqual([])
    expect(crumbs(undefined)).toEqual([])
  })
})
