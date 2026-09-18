/**
 * Names of all routes in ``router/index.ts``.
 *
 * Navigation (``router.push``, ``RouterLink``, redirects) refers to routes by
 * these names instead of hard-coded paths, so a route's path, layout, role
 * requirement and header title are defined only once — in the route table.
 */
export const ROUTE_NAMES = {
  login: 'login',
  callback: 'callback',
  home: 'home',
  dashboard: 'dashboard',
  courses: 'courses',
  coursesDetail: 'courses.detail',
  apps: 'apps',
  appsCreate: 'apps.create',
  appsDetail: 'apps.detail',
  help: 'help',
  deploymentsList: 'deployments.list',
  deploymentsDetail: 'deployments.detail',
  user: 'user',
  userOpenStack: 'user.openstack',
  deploymentConfig: 'deployment.config',
  deploymentTeams: 'deployment.teams',
  deploymentVariables: 'deployment.variables',
  deploymentSummary: 'deployment.summary',
  adminApps: 'admin.apps',
  forbidden: 'forbidden',
  notFound: 'not-found',
} as const

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
