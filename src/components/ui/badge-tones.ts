/**
 * Colour classes of the ``Badge`` tones.
 *
 * Kept next to the component but in its own module so other pills can reuse
 * the exact same colours. ``success``/``warning``/``danger`` are status
 * colours; ``info`` and ``emphasis`` are hue-free labels (roles, scopes) that
 * differ only in weight.
 */
import type { BadgeTone } from '@/types/tone'

export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'status-success',
  warning: 'status-warning',
  danger: 'status-danger',
  info: 'status-info',
  emphasis: 'status-emphasis',
  neutral: 'status-neutral',
}

/** Classes of a tone; unknown/missing tones fall back to neutral. */
export function badgeToneClasses(tone?: BadgeTone | null): string {
  return BADGE_TONE_CLASSES[tone as BadgeTone] ?? BADGE_TONE_CLASSES.neutral
}
