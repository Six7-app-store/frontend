import { describe, it, expect } from 'vitest'
import { Box, Database, Globe, LayoutTemplate, Layers, Server, Shield, Terminal } from 'lucide-vue-next'

import {
  appBannerStatus,
  findVersion,
  iconForAppName,
  storeApprovalState,
  versionInfo,
  versionOptions,
} from '@/services/app-presentation.service'

describe('iconForAppName', () => {
  it.each([
    ['Node API', Server],
    ['Vue Frontend', LayoutTemplate],
    ['React App', Globe],
    ['Jupyter Lab', Box],
    ['PostgreSQL', Database],
    ['Docker Sandbox', Terminal],
    ['Pentest Lab', Shield],
    ['Something else', Layers],
  ])('%s → icon', (name, icon) => {
    expect(iconForAppName(name)).toBe(icon)
  })

  it('checks keywords in priority order and tolerates empty names', () => {
    expect(iconForAppName('node frontend')).toBe(Server)
    expect(iconForAppName(null)).toBe(Layers)
    expect(iconForAppName('')).toBe(Layers)
  })
})

describe('storeApprovalState', () => {
  it('is approved as soon as one version is approved', () => {
    expect(storeApprovalState([{ status: 'pending' }, { status: 'approved' }])).toBe('approved')
  })

  it('is pending with an open submission and nothing approved', () => {
    expect(storeApprovalState([{ status: 'rejected' }, { status: 'pending' }])).toBe('pending')
  })

  it('is none without submissions or with rejections only', () => {
    expect(storeApprovalState([])).toBe('none')
    expect(storeApprovalState([{ status: 'rejected' }])).toBe('none')
  })
})

describe('appBannerStatus', () => {
  it('shows nothing for a private or missing app', () => {
    expect(appBannerStatus(null, [])).toBe('none')
    expect(appBannerStatus({ is_private: true }, [{ status: 'pending' }])).toBe('none')
  })

  it('asks for a submission when a public app has none', () => {
    expect(appBannerStatus({ is_private: false }, [])).toBe('no_submission')
  })

  it('follows the store state otherwise', () => {
    expect(appBannerStatus({}, [{ status: 'pending' }])).toBe('pending')
    expect(appBannerStatus({}, [{ status: 'pending' }, { status: 'approved' }])).toBe('approved')
  })
})

describe('versionOptions', () => {
  it('reads tags and release objects and drops empty ones', () => {
    expect(versionOptions(['v1', { version: 'v2' }, { releaseTag: 'v3' }, {}, ''])).toEqual(['v1', 'v2', 'v3'])
    expect(versionOptions(undefined)).toEqual([])
  })
})

describe('findVersion', () => {
  it('wraps a plain tag', () => {
    expect(findVersion(['v1'], 'v1')).toEqual({ version: 'v1' })
  })

  it('matches a release object by version, releaseTag or tag', () => {
    const release = { tag: 'v9', name: 'Nine' }
    expect(findVersion(['v1', release], 'v9')).toBe(release)
  })

  it('is null without a match or selection', () => {
    expect(findVersion(['v1'], 'v2')).toBeNull()
    expect(findVersion(['v1'], '')).toBeNull()
  })
})

describe('versionInfo', () => {
  it('reads the GitHub release fields', () => {
    expect(versionInfo({ name: 'R', commit: 'c', author: 'a', published_at: 'p', html_url: 'u', prerelease: false }))
      .toMatchObject({ name: 'R', commit: 'c', author: 'a', published_at: 'p', html_url: 'u', prerelease: false })
  })

  it('falls back to the git commit fields', () => {
    expect(versionInfo({ commit_sha: 's', commit_author: 'x', commit_date: 'd', url: 'l' }))
      .toMatchObject({ commit: 's', author: 'x', published_at: 'd', html_url: 'l', name: '' })
  })

  it('is null for a version without any detail', () => {
    expect(versionInfo({ version: 'v1' })).toBeNull()
    expect(versionInfo(null)).toBeNull()
  })
})
