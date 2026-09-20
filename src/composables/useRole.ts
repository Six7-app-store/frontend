import { computed } from "vue"
import { useAuthStore } from "@/stores/auth.store"
import type { App, Deployment, Course, UserRole as Role } from "@/types"

/**
 * Single source of truth for role + capability reads in the UI.
 *
 * Phase 4 of the RBAC plan replaces the old ``usePermissions`` and the
 * ``authStore.isAdmin`` / ``authStore.isTeacherOrAdmin`` direct reads
 * with this composable. The ``can*`` helpers mirror the backend
 * capabilities in ``backend/app/utils/capabilities.py`` — they are
 * purely cosmetic (controlling button visibility, route guards), the
 * authoritative check still happens in the API layer.
 */
export function useRole() {
  const auth = useAuthStore()
  const role = computed<Role | null>(() => auth.user?.role ?? null)
  const isAdmin = computed(() => role.value === "admin")
  const isTeacher = computed(() => role.value === "teacher")
  const isStudent = computed(() => role.value === "student")
  const isStaff = computed(() => isAdmin.value || isTeacher.value)

  // Capability mirror (cosmetic only; protects no data).
  const canEditApp = (app: App) =>
    isAdmin.value || app.userId === auth.user?.userId
  const canDeleteApp = canEditApp
  const canSubmitAppVersion = canEditApp
  const canApproveApp = computed(() => isAdmin.value)
  const canOperateDeployment = (d: Deployment) =>
    isAdmin.value || d.userId === auth.user?.userId
  // Mirrors ``ensure_edit_course``: admin, or a designated teacher of
  // *this* course. A plain teacher role is not enough — the courses list
  // returns every course, and acting on one they don't teach answers 403.
  // Covers renaming and deleting; adding/removing members is a separate,
  // staff-level right on the backend (``require_staff``).
  const canEditCourse = (c: Course) =>
    isAdmin.value || (c.teacherIds?.includes(auth.user?.userId ?? "") ?? false)
  const canDeleteCourse = canEditCourse
  const canChangeUserRole = computed(() => isAdmin.value)

  // Creating a deployment is staff work — mirrors ``can_create_deployment``
  // in backend/app/utils/capabilities.py, which rejects a student with
  // ``role_required``. Students receive access to an environment a teacher
  // set up for them; they never start one.
  const canCreateDeployment = computed(() => isStaff.value)

  // OpenStack credentials exist for one purpose: running a deployment
  // against the cloud. Someone who cannot create a deployment has nothing
  // to do with them, and showing the credential surface (banner, settings
  // page, quota tile) suggests otherwise. Hides the whole surface rather
  // than gating the individual widgets.
  const canUseOpenStack = computed(() => isStaff.value)

  return {
    role,
    isAdmin,
    isTeacher,
    isStudent,
    isStaff,
    canEditApp,
    canDeleteApp,
    canSubmitAppVersion,
    canApproveApp,
    canOperateDeployment,
    canEditCourse,
    canDeleteCourse,
    canChangeUserRole,
    canCreateDeployment,
    canUseOpenStack,
  }
}
