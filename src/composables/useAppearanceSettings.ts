import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue'
import { useUiSettingsStore } from '@/stores/ui-settings.store'
import { defaultAccentHex } from '@/composables/useBranding'
import { normalizeAccentHex } from '@/services/accent-palette.service'
import { readFileAsDataUrl, validateImageFile, type ImageFileProblem } from '@/utils/file'
import type { LogoVariant } from '@/types/ui-settings'

/**
 * State of the appearance page: the accent being edited — previewed on the
 * whole app while it differs from the saved one — and logo uploads. Toasts
 * stay with the page; failures are thrown.
 */
export function useAppearanceSettings() {
  const store = useUiSettingsStore()
  const builtInAccent = defaultAccentHex()

  const savedAccent = computed(() => store.settings.accentColor)
  /** What the accent is now, the built-in one spelled out. */
  const currentAccent = computed(() => savedAccent.value ?? builtInAccent)
  const hasCustomAccent = computed(() => savedAccent.value !== null)

  const draft = ref(currentAccent.value ?? '')
  const normalizedDraft = computed(() => normalizeAccentHex(draft.value))
  const isDraftValid = computed(() => normalizedDraft.value !== null)
  const isDirty = computed(() => isDraftValid.value && normalizedDraft.value !== currentAccent.value)

  // The settings may arrive after the page opened, and a save normalises
  // the spelling: follow the saved value.
  watch(savedAccent, () => {
    draft.value = currentAccent.value ?? ''
  })

  watch(
    [isDirty, normalizedDraft],
    ([dirty, hex]) => {
      if (dirty) store.previewAccentColor(hex)
      else store.clearPreview()
    },
    { immediate: true },
  )
  // Leaving the page drops an unsaved preview.
  if (getCurrentScope()) onScopeDispose(() => store.clearPreview())

  const saveAccent = async () => {
    if (!isDirty.value) return
    await store.saveAccent(normalizedDraft.value)
  }

  const resetAccent = async () => {
    await store.saveAccent(null)
  }

  const discardAccent = () => {
    draft.value = currentAccent.value ?? ''
  }

  const busyLogo = ref<LogoVariant | null>(null)

  const withBusy = async (variant: LogoVariant, fn: () => Promise<void>) => {
    busyLogo.value = variant
    try {
      await fn()
    } finally {
      busyLogo.value = null
    }
  }

  /** Uploads ``file`` as the ``variant`` logo; returns why it was refused, or ``null``. */
  const uploadLogo = async (variant: LogoVariant, file: File): Promise<ImageFileProblem | null> => {
    const problem = validateImageFile(file)
    if (problem) return problem
    await withBusy(variant, async () => {
      const dataUrl = await readFileAsDataUrl(file)
      if (!dataUrl) throw new Error('file could not be read')
      await store.uploadLogo(variant, dataUrl)
    })
    return null
  }

  const resetLogo = (variant: LogoVariant) => withBusy(variant, () => store.resetLogo(variant))

  return {
    draft,
    normalizedDraft,
    isDraftValid,
    isDirty,
    hasCustomAccent,
    saveAccent,
    resetAccent,
    discardAccent,
    busyLogo,
    uploadLogo,
    resetLogo,
  }
}
