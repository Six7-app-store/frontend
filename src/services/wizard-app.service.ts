/**
 * The app step of the deployment wizard: which apps it offers and how they
 * read on a card. Pure functions — no Vue, no I/O.
 */
import type { App } from '@/types'
import { descriptionPreview } from '@/services/app-presentation.service'

/** One line about the app: its intro heading, else its first paragraph. */
export function appTagline(app: Pick<App, 'description'>): string {
  const { heading, text } = descriptionPreview(app.description)
  return heading || text
}

/**
 * The apps the wizard offers: only those with an approved version, matching
 * ``query`` in name or tagline (case-insensitive), sorted by name.
 */
export function deployableApps(apps: readonly App[], query: string): App[] {
  const needle = query.trim().toLocaleLowerCase('de')
  return apps
    .filter((app) => !!app.latestApprovedVersion)
    .filter((app) => !needle
      || app.name.toLocaleLowerCase('de').includes(needle)
      || appTagline(app).toLocaleLowerCase('de').includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}
