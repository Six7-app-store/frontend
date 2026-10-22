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

/** An app none of whose versions is approved yet — only its owner may deploy it. */
export function isUnapproved(app: Pick<App, 'latestApprovedVersion'>): boolean {
  return !app.latestApprovedVersion
}

/**
 * The apps the wizard offers: those with an approved version plus the
 * caller's own apps (``ownerId``), which the backend lets their owner deploy
 * before any approval — so a freshly added app shows up right away. Matching
 * ``query`` in name or tagline (case-insensitive), sorted by name.
 */
export function deployableApps(apps: readonly App[], query: string, ownerId: string | null = null): App[] {
  const needle = query.trim().toLocaleLowerCase('de')
  return apps
    .filter((app) => !isUnapproved(app) || (!!ownerId && app.userId === ownerId))
    .filter((app) => !needle
      || app.name.toLocaleLowerCase('de').includes(needle)
      || appTagline(app).toLocaleLowerCase('de').includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}
