/**
 * Presentation rules for apps in the catalogue and detail view.
 */
import { marked, type Tokens } from 'marked'
import type { RouteLocationRaw } from 'vue-router'
import { plainText } from '@/services/markdown.service'
import { ROUTE_NAMES } from '@/router/route-names'
import type { AppVersionBadgeStatus } from '@/types'

/**
 * Where an app stands in the store, from its version approvals: one
 * approved version publishes it, otherwise an open submission counts,
 * otherwise nothing has been submitted.
 */
export function storeApprovalState(
  approvals: ReadonlyArray<{ status: string }>,
): 'approved' | 'pending' | 'none' {
  if (approvals.some((a) => a.status === 'approved')) return 'approved'
  if (approvals.some((a) => a.status === 'pending')) return 'pending'
  return 'none'
}

/** The store banner of an app: nothing for private apps, else its approval state. */
export function appBannerStatus(
  app: { is_private?: boolean } | null | undefined,
  approvals: ReadonlyArray<{ status: string }>,
): 'none' | 'no_submission' | 'pending' | 'approved' {
  if (!app || app.is_private) return 'none'
  const state = storeApprovalState(approvals)
  return state === 'none' ? 'no_submission' : state
}

/**
 * The status in the detail header. Without edit rights the approvals are
 * not loaded, but such a user only ever sees apps that are published.
 */
export function appStatus(
  app: { is_private?: boolean } | null | undefined,
  approvals: ReadonlyArray<{ status: string }>,
  canEdit: boolean,
): AppVersionBadgeStatus {
  if (!canEdit) return 'published'
  if (app?.is_private) return 'private'
  const state = storeApprovalState(approvals)
  if (state === 'approved') return 'published'
  return state === 'pending' ? 'pending' : 'new'
}

/** The tabs of the app detail page, in display order. */
export const APP_DETAIL_TABS = ['overview', 'docs', 'config', 'versions', 'settings'] as const
export type AppDetailTab = (typeof APP_DETAIL_TABS)[number]

/** What an app has to show; a tab without content is left out. */
export interface AppDetailContent {
  hasDescription: boolean
  hasVariables: boolean
  hasVersions: boolean
  /** Owner or admin: only they get the settings. */
  canEdit: boolean
}

export function appDetailTabs(content: AppDetailContent): AppDetailTab[] {
  const shown: Record<AppDetailTab, boolean> = {
    overview: true,
    docs: content.hasDescription,
    config: content.hasVariables,
    versions: content.hasVersions,
    settings: content.canEdit,
  }
  return APP_DETAIL_TABS.filter((tab) => shown[tab])
}

/** The tab a route parameter asks for; anything unknown or missing is the overview. */
export function requestedAppDetailTab(param: unknown): AppDetailTab {
  return APP_DETAIL_TABS.find((tab) => tab === param) ?? 'overview'
}

/** The URL of one tab. The overview has no segment of its own. */
export function appDetailLocation(appId: string, tab: AppDetailTab): RouteLocationRaw {
  return {
    name: ROUTE_NAMES.appsDetail,
    params: tab === 'overview' ? { id: appId } : { id: appId, tab },
  }
}

/** An app's versions come as plain tags or as release objects. */
export type AppVersionEntry = string | Record<string, any>

/** The selectable tags of an app's versions, in the order the backend sends them. */
export function versionOptions(versions: readonly AppVersionEntry[] | null | undefined): string[] {
  return (versions || [])
    .map((v) => (typeof v === 'string' ? v : v?.version || v?.releaseTag || ''))
    .filter(Boolean)
}

/** The release object behind ``tag``; a plain tag becomes ``{ version }``. */
export function findVersion(
  versions: readonly AppVersionEntry[] | null | undefined,
  tag: string,
): Record<string, any> | null {
  if (!versions || !tag) return null
  const match = versions.find((v) =>
    typeof v === 'string'
      ? v === tag
      : v?.version === tag || v?.releaseTag === tag || v?.tag === tag,
  )
  if (!match) return null
  return typeof match === 'string' ? { version: match } : match
}

const VERSION_INFO_KEYS = [
  'name', 'type', 'commit', 'description', 'author', 'published_at', 'prerelease', 'html_url',
  'commit_sha', 'commit_author', 'commit_date', 'url',
]

export interface VersionInfo {
  name: string
  type: string
  commit: string
  description: string
  author: string
  published_at: string
  prerelease: unknown
  html_url: string
}

/**
 * What the detail page shows about a version, from either field naming
 * the backend uses (GitHub release or git commit). ``null`` when the
 * version carries no such detail at all.
 */
export function versionInfo(details: Record<string, any> | null): VersionInfo | null {
  if (!details || !VERSION_INFO_KEYS.some((k) => Boolean(details[k]))) return null
  return {
    name: details.name ?? '',
    type: details.type ?? '',
    commit: details.commit ?? details.commit_sha ?? '',
    description: details.description ?? '',
    author: details.author ?? details.commit_author ?? '',
    published_at: details.published_at ?? details.commit_date ?? '',
    prerelease: details.prerelease ?? '',
    html_url: details.html_url ?? details.url ?? '',
  }
}

export interface DescriptionPreview {
  /** The description's opening heading, if it starts with one. */
  heading: string | null
  /** The first paragraph as plain text (no markdown marks). */
  text: string
}

/**
 * What an app card shows of a markdown description: the opening heading
 * as its own line and the first paragraph as plain text. Anything further
 * down (sections, tables, code) belongs on the detail page.
 */
export function descriptionPreview(markdown: string | null | undefined): DescriptionPreview {
  const tokens = marked.lexer(markdown ?? '').filter((token) => token.type !== 'space')
  const first = tokens[0]
  const heading = first?.type === 'heading' ? plainText((first as Tokens.Heading).tokens, (first as Tokens.Heading).text) : null
  const paragraph = tokens.find((token): token is Tokens.Paragraph => token.type === 'paragraph')
  const text = paragraph ? plainText(paragraph.tokens, paragraph.text) : ''
  return { heading, text: text.replace(/\s+/g, ' ').trim() }
}
