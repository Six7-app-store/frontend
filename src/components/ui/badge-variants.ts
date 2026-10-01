/**
 * Colour classes of the ``Badge`` variants.
 *
 * Kept next to the component but in its own module so other pills can reuse
 * the exact same colours — the member list in ``CourseDetailView`` renders a
 * differently shaped pill but must not invent its own role colours.
 *
 * The variant names are historical; the colours come from the design tokens.
 * Green, yellow and red are status colours; ``blue`` and ``purple`` are
 * hue-free labels (roles, scopes) that differ only in weight.
 */
export type BadgeVariant = 'green' | 'red' | 'gray' | 'blue' | 'purple' | 'yellow'

export const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: 'status-success',
  red: 'status-danger',
  blue: 'status-info',
  purple: 'status-emphasis',
  yellow: 'status-warning',
  gray: 'status-neutral',
}

/** Classes of a variant; unknown/missing variants fall back to grey. */
export function badgeVariantClasses(variant?: BadgeVariant | null): string {
  return BADGE_VARIANT_CLASSES[variant as BadgeVariant] ?? BADGE_VARIANT_CLASSES.gray
}
