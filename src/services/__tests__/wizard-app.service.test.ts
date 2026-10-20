import { describe, it, expect } from 'vitest'
import { appTagline, deployableApps } from '@/services/wizard-app.service'
import type { App } from '@/types'

const app = (name: string, over: Partial<App> = {}): App => ({
  appId: name.toLowerCase(),
  name,
  description: null,
  git_link: null,
  userId: 'u',
  created_at: '',
  releaseTag: '',
  is_private: false,
  latestApprovedVersion: 'v1.0.0',
  ...over,
})

describe('appTagline', () => {
  it('nimmt die Einleitungsüberschrift, sonst den ersten Absatz', () => {
    expect(appTagline({ description: '# Java im Browser\n\nMehr Text' })).toBe('Java im Browser')
    expect(appTagline({ description: 'Ein **LaTeX**-Editor.\n\n## Details' })).toBe('Ein LaTeX-Editor.')
    expect(appTagline({ description: null })).toBe('')
  })
})

describe('deployableApps', () => {
  const apps = [
    app('Web-LaTeX', { description: 'Editor für Abschlussarbeiten' }),
    app('Online-IDE'),
    app('Entwurf', { latestApprovedVersion: null }),
  ]

  it('bietet nur Apps mit freigegebener Version an, nach Namen sortiert', () => {
    expect(deployableApps(apps, '').map((a) => a.name)).toEqual(['Online-IDE', 'Web-LaTeX'])
  })

  it('sucht ohne Groß-/Kleinschreibung in Name und Kurzbeschreibung', () => {
    expect(deployableApps(apps, 'ide').map((a) => a.name)).toEqual(['Online-IDE'])
    expect(deployableApps(apps, '  ABSCHLUSS ').map((a) => a.name)).toEqual(['Web-LaTeX'])
    expect(deployableApps(apps, 'entwurf')).toEqual([])
  })
})
