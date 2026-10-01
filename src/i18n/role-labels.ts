import type { UserRole } from "@/types"

/**
 * Central role-label registry. Views call ``t(roleLabelKey(role))`` for a single
 * canonical translation per role that survives locale switches. Keys live in
 * ``i18n/locales/{de,en}.ts`` under ``roleLabels.*``.
 */
export function roleLabelKey(role: string | undefined | null): string {
  switch (role) {
    case "admin":
    case "teacher":
    case "student":
      return `roleLabels.${role}`
    default:
      return "roleLabels.unknown"
  }
}

/** Variant name for the ``<Badge>`` UI component. */
export function roleBadgeVariant(role: string | undefined | null): 'yellow' | 'green' | 'red' | 'purple' | 'blue' | 'gray' {
  switch (role) {
    case "admin":
      return "purple"
    case "teacher":
      return "blue"
    // Green is reserved for status (running/success), not for a role.
    case "student":
      return "gray"
    default:
      return "gray"
  }
}

export type { UserRole }
