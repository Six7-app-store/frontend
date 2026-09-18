import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useDeploymentStore } from '@/stores/deployment.store'
import { useToast } from '@/composables/useToast'
import i18n from '@/i18n'
import CoursesView from "@/views/CoursesView.vue";
import CourseDetailView from "@/views/CourseDetailView.vue";
import AppsView from "@/views/AppsView.vue";
import HelpView from "@/views/HelpView.vue";
import DeploymentsView from "@/views/DeploymentsView.vue";
import DeploymentsListView from "@/views/DeploymentsListView.vue";
import DeploymentDetailView from "@/views/DeploymentDetailView.vue";
import LoginView from "@/views/LoginView.vue";
import DashboardView from "@/views/DashboardView.vue";
import UserView from "@/views/UserView.vue";
import AddAppsView from "@/views/AddAppsView.vue";
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'
import { ROUTE_NAMES } from '@/router/route-names'
import NewDeploymentConfigView from '@/views/NewDeploymentConfigView.vue';
import NewDeploymentSummaryView from '@/views/NewDeploymentSummaryView.vue';
import NewDeploymentVariableView from '@/views/NewDeploymentVariableView.vue';
import AppsDetailView from "@/views/AppsDetailView.vue";
import NewDeploymentGroupsAssignmentView from '@/views/NewDeploymentGroupsAssignmentView.vue'


/**
 * Guard for the wizard steps. Prevents deep-links that skip the wizard state
 * model (e.g. ``/deployment/new/summary`` without an app selected). When fields
 * are missing, the guard redirects to the matching earlier step.
 *
 * Accepted fields:
 *  - ``appId``      → present = string, otherwise back to the apps overview
 *  - ``name``       → non-empty string
 *  - ``studentIds`` → at least 1 entry
 */
type WizardField = 'appId' | 'name' | 'studentIds'

function requireWizardStep(required: WizardField[]) {
  return () => {
    const draft = useDeploymentStore().draft
    for (const field of required) {
      const val = (draft as any)[field]
      if (field === 'studentIds') {
        if (!Array.isArray(val) || val.length === 0) {
          // No students, nothing to do → step 1.
          return { name: ROUTE_NAMES.deploymentConfig }
        }
      } else if (field === 'appId') {
        if (!val) {
          // No app, no wizard entry point → back to the apps list.
          return { name: ROUTE_NAMES.apps }
        }
      } else if (typeof val !== 'string' || val.trim() === '') {
        return { name: ROUTE_NAMES.deploymentConfig }
      }
    }
    return true
  }
}


// Route table — the single place that defines paths, names, layouts, role
// requirements, header titles (``meta.titleKey``) and the dashboard mesh
// background (``meta.useMeshBg``). Exported so layouts and tests can rely
// on the same definitions.
export const routes: RouteRecordRaw[] = [
  // AUTH LAYOUT
  {
    path: "/login",
    name: ROUTE_NAMES.login,
    component: LoginView,
    meta: { layout: "auth", requiresGuest: true },
  },
  {
    path: "/callback",
    name: ROUTE_NAMES.callback,
    component: () => import('@/views/CallbackView.vue'),
    meta: { layout: "auth" },
  },

  // APP LAYOUT
  {
    path: "/",
    name: ROUTE_NAMES.home,
    component: DashboardView,
    meta: { layout: "app", requiresAuth: true, titleKey: "nav.dashboard", useMeshBg: true },
  },
  {
    path: "/dashboard",
    name: ROUTE_NAMES.dashboard,
    component: DashboardView,
    meta: { layout: "app", requiresAuth: true, titleKey: "nav.dashboard", useMeshBg: true },
  },
  {
    path: "/courses",
    name: ROUTE_NAMES.courses,
    component: CoursesView,
    meta: {
      layout: "app",
      requiresAuth: true,
      titleKey: "nav.courses",
      requiresRole: ['teacher', 'admin']
    },
  },
  {
    path: "/courses/:id",
    name: ROUTE_NAMES.coursesDetail,
    component: CourseDetailView,
    meta: {
      layout: "app",
      requiresAuth: true,
      titleKey: "nav.courses",
      requiresRole: ['teacher', 'admin']
    },
  },
  {
    path: "/apps",
    name: ROUTE_NAMES.apps,
    component: AppsView,
    meta: { layout: "app", requiresAuth: true, titleKey: "nav.apps" },
  },
  {
    path: "/apps/create",
    name: ROUTE_NAMES.appsCreate,
    component: AddAppsView,
    meta: { layout: "app", requiresAuth: true, titleKey: "nav.apps" },
  },
  {
    path: "/apps/:id",
    name: ROUTE_NAMES.appsDetail,
    component: AppsDetailView,
    meta: { layout: "app", requiresAuth: true, titleKey: "nav.apps" },
  },
  {
    path: "/help",
    name: ROUTE_NAMES.help,
    component: HelpView,
    meta: { layout: "app", requiresAuth: true, titleKey: "nav.help" },
  },
  {
    path: "/deployments",
    component: DeploymentsView,
    // Child routes inherit this meta (incl. the header title).
    meta: { layout: "app", requiresAuth: true, titleKey: "nav.deployments" },
    children: [
      {
        path: '',
        name: ROUTE_NAMES.deploymentsList,
        component: DeploymentsListView,
      },
      {
        path: '/deployments/:id',
        name: ROUTE_NAMES.deploymentsDetail,
        component: DeploymentDetailView,
        props: true,
      }
    ],
  },
  // User Profile
  {
    path: "/user",
    name: ROUTE_NAMES.user,
    component: UserView,
    meta: { layout: "user", requiresAuth: true },
  },
  {
    path: '/deployment/new/config',
    name: ROUTE_NAMES.deploymentConfig,
    component: NewDeploymentConfigView,
    meta: { requiresAuth: true, layout: 'app' }
  },
  {
    path: '/deployment/new/teams',
    name: ROUTE_NAMES.deploymentTeams,
    component: NewDeploymentGroupsAssignmentView,
    meta: { requiresAuth: true, layout: 'app' },
    // Step 2 requires step 1 (app + name + at least one student). Deep-links
    // otherwise redirect to step 1.
    beforeEnter: requireWizardStep(['appId', 'name', 'studentIds']),
  },
  {
    path: '/deployment/new/variables',
    name: ROUTE_NAMES.deploymentVariables,
    component: NewDeploymentVariableView,
    meta: { requiresAuth: true, layout: 'app' },
    // The variables step needs the team setup filled in; otherwise redirect
    // to the matching earlier step.
    beforeEnter: requireWizardStep(['appId', 'name', 'studentIds']),
  },
  {
    path: '/deployment/new/summary',
    name: ROUTE_NAMES.deploymentSummary,
    component: NewDeploymentSummaryView,
    meta: { requiresAuth: true, layout: 'app' },
    // Summary is only reachable once all previous steps have data.
    beforeEnter: requireWizardStep(['appId', 'name', 'studentIds']),
  },
  {
    path: '/admin/apps',
    name: ROUTE_NAMES.adminApps,
    component: () => import('@/views/AdminAppsView.vue'),
    meta: { requiresAuth: true, layout: 'app', requiresRole: ['admin'] as UserRole[], titleKey: 'nav.approvals' },
  },
  {
    path: '/user/openstack',
    name: ROUTE_NAMES.userOpenStack,
    component: () => import('@/views/SettingsOpenStackView.vue'),
    meta: { requiresAuth: true, layout: 'user' },
  },
  {
    path: '/forbidden',
    name: ROUTE_NAMES.forbidden,
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { requiresAuth: true, layout: 'app' },
  },
  // Catch-all: keep it last. Without it an unknown URL matched nothing and
  // rendered an empty page inside the app layout.
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/views/NotFoundView.vue'),
    meta: { requiresAuth: true, layout: 'app' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Guards
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (authStore.isLoading) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (!authStore.user && to.path !== '/callback' && to.path !== '/login') {
    await authStore.initialize()
  }

  const requiresAuth = to.meta.requiresAuth as boolean
  const requiresGuest = to.meta.requiresGuest as boolean
  const requiresRole = to.meta.requiresRole as UserRole[] | undefined

  if (requiresGuest && authStore.isAuthenticated) {
    return next('/dashboard')
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    const returnUrl = to.fullPath
    return next(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  if (requiresRole && requiresRole.length > 0) {
    if (!authStore.hasAnyRole(...requiresRole)) {
      // Show a toast naming the required role, then send the user to the
      // dedicated /forbidden route so refresh + history stay clean.
      try {
        const tr = i18n.global.t
        const required = requiresRole.map((r) => tr(`roleLabels.${r}`)).join(', ')
        useToast().error(tr('router.forbidden', { roles: required }))
      } catch {
        // Toast/i18n not available (e.g. very early boot) — hard fallback so
        // the redirect still happens.
      }
      return next({ path: '/forbidden' })
    }
  }

  next()
})

export default router;
