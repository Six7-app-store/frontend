import type { UserRole } from "@/types"
import type { BadgeTone } from "@/types/tone"

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

/** Tone for the ``<Badge>`` UI component. */
export function roleBadgeTone(role: string | undefined | null): BadgeTone {
  switch (role) {
    case "admin":
      return "emphasis"
    case "teacher":
      return "info"
    // Green is reserved for status (running/success), not for a role.
    default:
      return "neutral"
  }
}

export type { UserRole }
