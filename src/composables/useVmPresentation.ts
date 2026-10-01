/**
 * Shared presentation helpers for the Infrastructure VM components
 * (``InfrastructureVmCard`` and ``InfrastructureVmDrawer``).
 *
 * Both components render the same two derived values: the VM uptime
 * (from ``hardware.launched_at``) and the lifecycle pill's colour
 * classes (from the OpenStack status). These helpers are the single source
 * of truth for that formatting so the two components stay in lockstep.
 */

type PillTone = 'green' | 'amber' | 'red' | 'grey'

/**
 * Format a VM's uptime relative to the user's browser clock.
 *
 * Server-clock-robust: we subtract ``launched_at`` from ``Date.now()``
 * in the user's browser. A 200ms-skewed clock costs nothing.
 *
 * Returns ``null`` when the timestamp is absent, unparseable, or in the
 * future (negative delta).
 */
export function formatUptime(launchedAt?: string | null): string | null {
  if (!launchedAt) return null
  const launched = new Date(launchedAt).getTime()
  if (!Number.isFinite(launched)) return null
  const delta = Date.now() - launched
  if (delta < 0) return null
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

/**
 * Tone of a VM's OpenStack lifecycle status: healthy, being built, broken,
 * or anything else (SHUTOFF, PAUSED, SUSPENDED, MIGRATING, …) as neutral.
 * This is the only place the frontend interprets OpenStack lifecycle
 * vocabulary — keep it tight.
 */
function lifecycleTone(status?: string | null): PillTone {
  if (status === 'ACTIVE') return 'green'
  if (status === 'ERROR') return 'red'
  if (status === 'BUILD' || status === 'REBUILD') return 'amber'
  return 'grey'
}

/** Tailwind pill classes for a VM's OpenStack lifecycle status. */
export function lifecyclePillClass(status?: string | null): string {
  switch (lifecycleTone(status)) {
    case 'green':
      return 'status-success'
    case 'red':
      return 'status-danger'
    case 'amber':
      return 'status-warning'
    default:
      return 'status-neutral'
  }
}
