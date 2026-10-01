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
  const canEditCourse = (c: Course) =>
    isAdmin.value ||
    ((c as Course & { teacherIds?: string[] }).teacherIds?.includes(
      auth.user?.userId ?? ""
    ) ?? false)
  const canChangeUserRole = computed(() => isAdmin.value)

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
    canChangeUserRole,
  }
}
