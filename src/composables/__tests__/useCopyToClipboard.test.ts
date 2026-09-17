import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const copyText = vi.hoisted(() => vi.fn())
vi.mock('@/utils/clipboard', () => ({ copyText }))

import { useCopyToClipboard } from '@/composables/useCopyToClipboard'

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    copyText.mockReset().mockResolvedValue(undefined)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('copies and marks the key as copied until the reset delay has passed', async () => {
    const { copiedKey, copyToClipboard } = useCopyToClipboard()

    await copyToClipboard('ssh anna@10.0.0.5', 'ssh-anna')

    expect(copyText).toHaveBeenCalledWith('ssh anna@10.0.0.5')
    expect(copiedKey.value).toBe('ssh-anna')
    vi.advanceTimersByTime(1499)
    expect(copiedKey.value).toBe('ssh-anna')
    vi.advanceTimersByTime(1)
    expect(copiedKey.value).toBeNull()
  })

  it('keeps only the last copied key and restarts the delay', async () => {
    const { copiedKey, copyToClipboard } = useCopyToClipboard()

    await copyToClipboard('a', 'first')
    vi.advanceTimersByTime(1000)
    await copyToClipboard('b', 'second')
    vi.advanceTimersByTime(1000)

    expect(copiedKey.value).toBe('second')
    vi.advanceTimersByTime(500)
    expect(copiedKey.value).toBeNull()
  })

  it('ignores empty text', async () => {
    const { copiedKey, copyToClipboard } = useCopyToClipboard()

    await copyToClipboard('', 'empty')

    expect(copyText).not.toHaveBeenCalled()
    expect(copiedKey.value).toBeNull()
  })

  it('logs a failed copy without marking the key', async () => {
    const error = new Error('denied')
    copyText.mockRejectedValue(error)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { copiedKey, copyToClipboard } = useCopyToClipboard()

    await copyToClipboard('x', 'key')

    expect(copiedKey.value).toBeNull()
    expect(spy).toHaveBeenCalledWith('Copy failed:', error)
    spy.mockRestore()
  })

  it('supports a custom reset delay', async () => {
    const { copiedKey, copyToClipboard } = useCopyToClipboard(100)

    await copyToClipboard('x', 'key')
    vi.advanceTimersByTime(100)

    expect(copiedKey.value).toBeNull()
  })
})
