/**
 * Keeps the deployment wizard's draft in sessionStorage so a reload in the
 * middle of the wizard does not lose it. Pure functions over a ``Storage``;
 * the caller passes ``null`` when there is none (private mode, blocked
 * site data), and every access is guarded because it can throw.
 */
import type { DeploymentDraft } from '@/types'

export const DRAFT_STORAGE_KEY = 'deployment.draft.v1'

export type SaveResult = 'saved' | 'withoutFiles' | 'failed'

const hasFiles = (draft: DeploymentDraft): boolean =>
  Object.values(draft.fileUploads ?? {}).some((slots) => Object.keys(slots ?? {}).length > 0)

/**
 * Writes the draft. Uploaded files are base64 and can outgrow the storage
 * quota; then the draft is kept without them and marked ``filesLost``, so
 * the start step can ask for them again after a reload.
 */
export function saveDraft(storage: Storage | null, draft: DeploymentDraft): SaveResult {
  if (!storage) return 'failed'
  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    return 'saved'
  } catch {
    if (!hasFiles(draft)) return 'failed'
  }
  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, fileUploads: {}, filesLost: true }))
    return 'withoutFiles'
  } catch {
    return 'failed'
  }
}

/**
 * The stored draft laid over ``fresh`` (so fields added later get their
 * default), or ``null`` when nothing usable is stored.
 */
export function loadDraft(storage: Storage | null, fresh: DeploymentDraft): DeploymentDraft | null {
  if (!storage) return null
  let raw: string | null
  try {
    raw = storage.getItem(DRAFT_STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const stored = parsed as Partial<DeploymentDraft>
    if (!Array.isArray(stored.studentIds) || typeof stored.name !== 'string') return null
    return { ...fresh, ...stored }
  } catch {
    return null
  }
}

export function clearDraft(storage: Storage | null): void {
  try {
    storage?.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // Nothing stored that could be read back — nothing to clear.
  }
}

/** ``sessionStorage``, or ``null`` where the browser refuses access to it. */
export function sessionStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}
