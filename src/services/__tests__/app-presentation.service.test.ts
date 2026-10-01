import { describe, it, expect } from 'vitest'

import {
  descriptionPreview,
  appBannerStatus,
  appDetailLocation,
  appDetailTabs,
  appStatus,
  findVersion,
  requestedAppDetailTab,
  storeApprovalState,
  versionInfo,
  versionOptions,
} from '@/services/app-presentation.service'
import { ROUTE_NAMES } from '@/router/route-names'

describe('appStatus', () => {
  it('counts as published for those without edit rights', () => {
    expect(appStatus({ is_private: false }, [], false)).toBe('published')
  })

  it('shows a private app as private, whatever was approved', () => {
    expect(appStatus({ is_private: true }, [{ status: 'approved' }], true)).toBe('private')
  })

  it('follows the approvals for a public app', () => {
    expect(appStatus({}, [{ status: 'approved' }], true)).toBe('published')
    expect(appStatus({}, [{ status: 'pending' }], true)).toBe('pending')
    expect(appStatus({}, [{ status: 'rejected' }], true)).toBe('new')
    expect(appStatus({}, [], true)).toBe('new')
  })
})

describe('appDetailTabs', () => {
  const nothing = { hasDescription: false, hasVariables: false, hasVersions: false, canEdit: false }

  it('always has the overview', () => {
    expect(appDetailTabs(nothing)).toEqual(['overview'])
  })

  it('adds every tab that has content, in a fixed order', () => {
    expect(appDetailTabs({ hasDescription: true, hasVariables: true, hasVersions: true, canEdit: true }))
      .toEqual(['overview', 'docs', 'config', 'versions', 'settings'])
  })

  it('leaves out the settings without edit rights and the configuration without variables', () => {
    expect(appDetailTabs({ ...nothing, hasDescription: true, hasVersions: true }))
      .toEqual(['overview', 'docs', 'versions'])
  })
})

describe('requestedAppDetailTab', () => {
  it('takes a known tab from the route', () => {
    expect(requestedAppDetailTab('config')).toBe('config')
  })

  it('falls back to the overview', () => {
    expect(requestedAppDetailTab(undefined)).toBe('overview')
    expect(requestedAppDetailTab('')).toBe('overview')
    expect(requestedAppDetailTab(['docs'])).toBe('overview')
  })
})

describe('appDetailLocation', () => {
  it('gives the overview no segment and every other tab its own', () => {
    expect(appDetailLocation('a1', 'overview')).toEqual({ name: ROUTE_NAMES.appsDetail, params: { id: 'a1' } })
    expect(appDetailLocation('a1', 'docs')).toEqual({ name: ROUTE_NAMES.appsDetail, params: { id: 'a1', tab: 'docs' } })
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

describe('descriptionPreview', () => {
  it('nimmt die erste Überschrift und den ersten Absatz als Klartext', () => {
    const md = [
      '# GitLab CE – Git pro Student',
      '',
      'Deployt **pro Team** eine',
      '[GitLab](https://gitlab.com) mit `gp1.small`.',
      '',
      '## Details',
      '',
      'Mehr Text.',
    ].join('\n')

    expect(descriptionPreview(md)).toEqual({
      heading: 'GitLab CE – Git pro Student',
      text: 'Deployt pro Team eine GitLab mit gp1.small.',
    })
  })

  it('hat ohne einleitende Überschrift nur Text', () => {
    expect(descriptionPreview('Nur ein Absatz.\n\n## Später')).toEqual({ heading: null, text: 'Nur ein Absatz.' })
  })

  it('liefert für leere Beschreibungen nichts', () => {
    expect(descriptionPreview(null)).toEqual({ heading: null, text: '' })
    expect(descriptionPreview('   ')).toEqual({ heading: null, text: '' })
  })

  it('übergeht HTML-Blöcke und nimmt den ersten echten Absatz', () => {
    expect(descriptionPreview('<div onclick="alert(1)">x</div>\n\nHallo').text).toBe('Hallo')
  })
})
