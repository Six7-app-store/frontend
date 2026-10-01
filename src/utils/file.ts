/**
 * Browser file helpers shared by the app create/edit forms.
 *
 * - :func:`readFileAsDataUrl` — read a file into a ``data:`` URL.
 * - :func:`validateImageFile` — the client-side image checks (type + size).
 */
import { MAX_IMAGE_BYTES } from '@/utils/format'

/** Read ``file`` as a ``data:`` URL; ``null`` if the reader yields no string. */
export function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export type ImageFileProblem = 'not_image' | 'too_large'

/**
 * Validate an uploaded app image: must be an ``image/*`` type and at most
 * ``MAX_IMAGE_BYTES``. Returns the first problem or ``null``; the caller
 * decides how to report it.
 */
export function validateImageFile(file: File): ImageFileProblem | null {
  if (!file.type.startsWith('image/')) return 'not_image'
  if (file.size > MAX_IMAGE_BYTES) return 'too_large'
  return null
}

/** Size limit in whole MB for user-facing messages. */
export const MAX_IMAGE_MB = Math.round(MAX_IMAGE_BYTES / 1024 / 1024)
