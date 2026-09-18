/**
 * Colour classes of the ``Badge`` variants.
 *
 * Kept next to the component but in its own module so other pills can reuse
 * the exact same colours — the member list in ``CourseDetailView`` renders a
 * differently shaped pill but must not invent its own role colours.
 */
export type BadgeVariant = 'green' | 'red' | 'gray' | 'blue' | 'purple' | 'yellow'

export const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-700',
}

/** Classes of a variant; unknown/missing variants fall back to grey. */
export function badgeVariantClasses(variant?: BadgeVariant | null): string {
  return BADGE_VARIANT_CLASSES[variant as BadgeVariant] ?? BADGE_VARIANT_CLASSES.gray
}
