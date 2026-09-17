import { ref } from 'vue'
import { copyText } from '@/utils/clipboard'

/**
 * Copy-to-clipboard with short-lived "copied" feedback.
 *
 * Each copy button tags its call with a unique key; the key of whichever
 * was last successfully copied is stored in ``copiedKey`` for
 * ``resetMs`` (default ~1.5s) so the button can flip its icon to a check
 * as feedback. Multiple buttons can share one instance because only one
 * can be the "just copied" target at a time — share the instance across a
 * page rather than creating one per button.
 */
export function useCopyToClipboard(resetMs = 1500) {
  const copiedKey = ref<string | null>(null)
  let copyResetTimer: number | null = null

  const copyToClipboard = async (text: string, key: string) => {
    if (!text) return
    try {
      // ``copyText`` falls back to ``execCommand('copy')`` outside a
      // secure context (see ``utils/clipboard``).
      await copyText(text)
      copiedKey.value = key
      if (copyResetTimer !== null) window.clearTimeout(copyResetTimer)
      copyResetTimer = window.setTimeout(() => {
        copiedKey.value = null
        copyResetTimer = null
      }, resetMs)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return {
    copiedKey,
    copyToClipboard,
  }
}
