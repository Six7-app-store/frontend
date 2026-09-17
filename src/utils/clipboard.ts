/**
 * Clipboard helper.
 *
 * :func:`copyText` writes a string to the clipboard and rejects when the
 * browser refuses; callers own the "copied" feedback and error handling.
 */

export async function copyText(text: string): Promise<void> {
  // Modern ``navigator.clipboard`` requires a secure context
  // (https or localhost). Falls back to the legacy
  // ``execCommand('copy')`` so the button still works behind
  // plain http on the dev box.
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
  } else {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
