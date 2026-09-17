import { describe, it, expect } from 'vitest'

import { MAX_IMAGE_MB, readFileAsDataUrl, validateImageFile } from '@/utils/file'
import { MAX_IMAGE_BYTES } from '@/utils/format'

const fileOf = (type: string, size: number) =>
  new File([new Uint8Array(size)], 'upload', { type })

describe('validateImageFile', () => {
  it('accepts images up to the size limit', () => {
    expect(validateImageFile(fileOf('image/png', 10))).toBeNull()
    expect(validateImageFile(fileOf('image/jpeg', MAX_IMAGE_BYTES))).toBeNull()
  })

  it('rejects non-images before checking the size', () => {
    expect(validateImageFile(fileOf('application/pdf', MAX_IMAGE_BYTES + 1))).toBe('not_image')
  })

  it('rejects images above the size limit', () => {
    expect(validateImageFile(fileOf('image/png', MAX_IMAGE_BYTES + 1))).toBe('too_large')
  })

  it('exposes the limit in whole MB', () => {
    expect(MAX_IMAGE_MB).toBe(2)
  })
})

describe('readFileAsDataUrl', () => {
  it('reads a file into a data URL', async () => {
    const file = new File(['hi'], 'a.txt', { type: 'text/plain' })
    await expect(readFileAsDataUrl(file)).resolves.toMatch(/^data:text\/plain;base64,/)
  })
})
