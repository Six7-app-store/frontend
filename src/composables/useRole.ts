import { computed } from "vue"
import { useAuthStore } from "@/stores/auth.store"
import type { UserRole as Role } from "@/types"

/**
 * Single source of truth for role reads in the UI. Purely cosmetic
 * (button visibility, route guards) — the authoritative check still
 * happens in the API layer.
 */
export function useRole() {
  const auth = useAuthStore()
  const role = computed<Role | null>(() => auth.user?.role ?? null)
  const isAdmin = computed(() => role.value === "admin")
  const isTeacher = computed(() => role.value === "teacher")
  const isStudent = computed(() => role.value === "student")
  const isStaff = computed(() => isAdmin.value || isTeacher.value)

  return {
    role,
    isAdmin,
    isTeacher,
    isStudent,
    isStaff,
  }
}
