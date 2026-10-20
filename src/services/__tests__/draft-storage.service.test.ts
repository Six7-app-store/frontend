import { describe, it, expect, vi } from 'vitest'
import {
  DRAFT_STORAGE_KEY,
  clearDraft,
  loadDraft,
  saveDraft,
} from '@/services/draft-storage.service'
import type { DeploymentDraft } from '@/types'

const fresh = (): DeploymentDraft => ({
  entry: 'catalog',
  appId: null,
  releaseTag: '',
  name: '',
  courseIds: [],
  studentIds: [],
  groupMode: 'one',
  groupCount: 1,
  assignments: [],
  userInputVar: {},
  variables: {},
  version: '',
  groupNames: [],
  fileUploads: {},
})

/** A Storage that holds strings up to ``limit`` characters. */
function memoryStorage(limit = Infinity): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    removeItem: (k: string) => { data.delete(k) },
    setItem: (k: string, v: string) => {
      if (v.length > limit) throw new DOMException('full', 'QuotaExceededError')
      data.set(k, v)
    },
  }
}

const withFile = (): DeploymentDraft => ({
  ...fresh(),
  appId: 'app-1',
  releaseTag: 'v1.0.0',
  name: 'Kurs',
  studentIds: ['u1'],
  fileUploads: { task: { all: { name: 'a.java', content_b64: 'x'.repeat(5000), size: 3750, content_type: 'text/plain' } } },
})

describe('saveDraft / loadDraft', () => {
  it('stellt einen gespeicherten Draft samt Version und Dateien wieder her', () => {
    const storage = memoryStorage()
    expect(saveDraft(storage, withFile())).toBe('saved')

    const restored = loadDraft(storage, fresh())
    expect(restored?.releaseTag).toBe('v1.0.0')
    expect(restored?.fileUploads?.task?.all?.name).toBe('a.java')
    expect(restored?.filesLost).toBeUndefined()
  })

  it('speichert ohne Dateien und merkt sich das, wenn der Speicher voll ist', () => {
    const storage = memoryStorage(1000)
    expect(saveDraft(storage, withFile())).toBe('withoutFiles')

    const restored = loadDraft(storage, fresh())
    expect(restored?.name).toBe('Kurs')
    expect(restored?.fileUploads).toEqual({})
    expect(restored?.filesLost).toBe(true)
  })

  it('meldet einen Fehlschlag ohne Speicher oder wenn auch der Draft allein nicht passt', () => {
    expect(saveDraft(null, fresh())).toBe('failed')
    expect(saveDraft(memoryStorage(10), fresh())).toBe('failed')
    expect(saveDraft(memoryStorage(10), withFile())).toBe('failed')
  })

  it('füllt neue Felder aus dem frischen Draft auf', () => {
    const storage = memoryStorage()
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ name: 'alt', studentIds: ['u1'] }))
    const restored = loadDraft(storage, fresh())
    expect(restored?.name).toBe('alt')
    expect(restored?.entry).toBe('catalog')
  })

  it('verwirft Unlesbares und fremde Formen', () => {
    const storage = memoryStorage()
    expect(loadDraft(storage, fresh())).toBeNull()
    storage.setItem(DRAFT_STORAGE_KEY, '{kaputt')
    expect(loadDraft(storage, fresh())).toBeNull()
    storage.setItem(DRAFT_STORAGE_KEY, '[]')
    expect(loadDraft(storage, fresh())).toBeNull()
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ name: 1 }))
    expect(loadDraft(storage, fresh())).toBeNull()
    expect(loadDraft(null, fresh())).toBeNull()
  })

  it('übersteht einen Speicher, der beim Lesen wirft', () => {
    const storage = memoryStorage()
    storage.getItem = vi.fn(() => { throw new Error('blocked') })
    expect(loadDraft(storage, fresh())).toBeNull()
  })
})

describe('clearDraft', () => {
  it('löscht den Draft und übersteht einen fehlenden oder werfenden Speicher', () => {
    const storage = memoryStorage()
    saveDraft(storage, fresh())
    clearDraft(storage)
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull()

    expect(() => clearDraft(null)).not.toThrow()
    storage.removeItem = () => { throw new Error('blocked') }
    expect(() => clearDraft(storage)).not.toThrow()
  })
})
