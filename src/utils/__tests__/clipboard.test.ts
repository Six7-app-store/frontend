import { describe, it, expect, vi } from 'vitest'

import { copyText } from '@/utils/clipboard'

const setSecureContext = (value: boolean) =>
  Object.defineProperty(window, 'isSecureContext', { value, configurable: true })

const setClipboard = (writeText: ((text: string) => Promise<void>) | undefined) =>
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  })

describe('copyText', () => {
  it('uses navigator.clipboard in a secure context', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setSecureContext(true)
    setClipboard(writeText)

    await copyText('hello')

    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('rejects when navigator.clipboard refuses', async () => {
    setSecureContext(true)
    setClipboard(vi.fn().mockRejectedValue(new Error('denied')))

    await expect(copyText('hello')).rejects.toThrow('denied')
  })

  it('falls back to a temporary textarea + execCommand outside a secure context', async () => {
    const writeText = vi.fn()
    setSecureContext(false)
    setClipboard(writeText)
    let copiedValue: string | undefined
    const execCommand = vi.fn(() => {
      copiedValue = document.querySelector('textarea')?.value
      return true
    })
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })

    await copyText('fallback')

    expect(writeText).not.toHaveBeenCalled()
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(copiedValue).toBe('fallback')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('uses the fallback when navigator.clipboard is missing', async () => {
    setSecureContext(true)
    setClipboard(undefined)
    const execCommand = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })

    await copyText('x')

    expect(execCommand).toHaveBeenCalledWith('copy')
  })
})
