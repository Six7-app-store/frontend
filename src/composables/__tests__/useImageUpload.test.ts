import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: h.toastError }) }))

import { useImageUpload } from '@/composables/useImageUpload'

const png = (name = 'a.png') => new File(['x'], name, { type: 'image/png' })

describe('useImageUpload', () => {
  let n = 0
  beforeEach(() => {
    vi.clearAllMocks()
    global.URL.createObjectURL = vi.fn(() => `blob:${++n}`)
    global.URL.revokeObjectURL = vi.fn()
  })

  it('starts from the existing image and changes nothing until asked', () => {
    const img = useImageUpload()
    img.reset('data:old')
    expect(img.previewUrl.value).toBe('data:old')
    expect(img.file.value).toBeNull()
    expect(img.removed.value).toBe(false)
  })

  it('previews a chosen image and frees the previous preview it created', () => {
    const img = useImageUpload()
    img.reset('data:old')
    img.choose(png())
    const first = img.previewUrl.value
    img.choose(png('b.png'))

    expect(img.file.value?.name).toBe('b.png')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first)
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('data:old')
  })

  it('refuses non-images and oversized images with a toast', () => {
    const img = useImageUpload()
    img.choose(new File(['x'], 'a.txt', { type: 'text/plain' }))
    const huge = png()
    Object.defineProperty(huge, 'size', { value: 3 * 1024 * 1024 })
    img.choose(huge)

    expect(h.toastError.mock.calls.map((c) => c[0])).toEqual(['image.onlyImages', 'image.tooLarge'])
    expect(img.file.value).toBeNull()
  })

  it('marks the image as removed', () => {
    const img = useImageUpload()
    img.reset('data:old')
    img.remove()
    expect(img.previewUrl.value).toBeNull()
    expect(img.removed.value).toBe(true)
  })
})
