/**
 * The breadcrumb trail of a route: where the page sits in the app, e.g.
 * "Apps / Online-IDE". Pure — the labels come from ``t`` and the name of the
 * entity a detail page shows from ``entityLabel``.
 */
import type { Crumb } from '@/components/ui/breadcrumb'
import { ROUTE_NAMES } from '@/router/route-names'

export interface BreadcrumbContext {
  routeName: string | symbol | null | undefined
  /** Name of the app, course or deployment a detail page shows, once loaded. */
  entityLabel?: string | null
  /** Students see "Environments" where everyone else sees "Deployments". */
  isStudent: boolean
  t: (key: string) => string
}

/** Stands in for the entity's name while it is still loading. */
const LOADING_LABEL = '…'

export function buildBreadcrumbs({ routeName, entityLabel, isStudent, t }: BreadcrumbContext): Crumb[] {
  const entity = entityLabel?.trim() || LOADING_LABEL
  const deployments: Crumb = {
    label: t(isStudent ? 'nav.environments' : 'nav.deployments'),
    to: { name: ROUTE_NAMES.deploymentsList },
  }
  const withoutLink = (crumb: Crumb): Crumb => ({ label: crumb.label })

  switch (routeName) {
    case ROUTE_NAMES.home:
    case ROUTE_NAMES.dashboard:
      return [{ label: t('nav.dashboard') }]

    case ROUTE_NAMES.courses:
      return [{ label: t('nav.courses') }]
    case ROUTE_NAMES.coursesDetail:
      return [{ label: t('nav.courses'), to: { name: ROUTE_NAMES.courses } }, { label: entity }]

    case ROUTE_NAMES.apps:
      return [{ label: t('nav.apps') }]
    case ROUTE_NAMES.appsCreate:
      return [{ label: t('nav.apps'), to: { name: ROUTE_NAMES.apps } }, { label: t('AppsCreateView.title') }]
    case ROUTE_NAMES.appsDetail:
      return [{ label: t('nav.apps'), to: { name: ROUTE_NAMES.apps } }, { label: entity }]

    case ROUTE_NAMES.deploymentsList:
      return [withoutLink(deployments)]
    case ROUTE_NAMES.deploymentsDetail:
      return [deployments, { label: entity }]
    case ROUTE_NAMES.deploymentConfig:
    case ROUTE_NAMES.deploymentTeams:
    case ROUTE_NAMES.deploymentVariables:
    case ROUTE_NAMES.deploymentSummary:
      return [deployments, { label: t('deployment.title') }]

    case ROUTE_NAMES.adminApps:
      return [{ label: t('nav.admin') }, { label: t('nav.approvals') }]
    case ROUTE_NAMES.adminAppearance:
      return [{ label: t('nav.admin') }, { label: t('nav.appearance') }]
    case ROUTE_NAMES.help:
      return [{ label: t('nav.help') }]

    case ROUTE_NAMES.user:
      return [{ label: t('nav.profile') }]
    case ROUTE_NAMES.userOpenStack:
      return [{ label: t('nav.profile'), to: { name: ROUTE_NAMES.user } }, { label: t('SettingsOpenStackView.title') }]

    case ROUTE_NAMES.forbidden:
      return [{ label: t('ForbiddenView.title') }]
    case ROUTE_NAMES.notFound:
      return [{ label: t('NotFoundView.title') }]

    default:
      return []
  }
}
