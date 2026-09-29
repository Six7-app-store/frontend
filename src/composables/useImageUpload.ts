import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { MAX_IMAGE_MB, validateImageFile } from '@/utils/file'

/**
 * State of an app-image field: the newly chosen file with its preview, or
 * the image the app already has, or "removed". Invalid files are refused
 * with a toast and leave the state as it was.
 *
 * ``removed`` tells "the user cleared the image" apart from "the user did
 * nothing" — an edit only sends the image when one of the two happened.
 */
export function useImageUpload() {
  const { t } = useI18n()
  const toast = useToast()

  const file = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const removed = ref(false)

  // Only object URLs this composable created are revoked; an existing
  // image URL passed to ``reset`` belongs to the caller.
  let objectUrl: string | null = null
  const releaseObjectUrl = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }

  const reset = (existingUrl: string | null = null) => {
    releaseObjectUrl()
    file.value = null
    removed.value = false
    previewUrl.value = existingUrl
  }

  const choose = (chosen: File) => {
    const problem = validateImageFile(chosen)
    if (problem === 'not_image') {
      toast.error(t('image.onlyImages'))
      return
    }
    if (problem === 'too_large') {
      toast.error(t('image.tooLarge', { size: MAX_IMAGE_MB }))
      return
    }
    releaseObjectUrl()
    objectUrl = URL.createObjectURL(chosen)
    file.value = chosen
    removed.value = false
    previewUrl.value = objectUrl
  }

  const remove = () => {
    releaseObjectUrl()
    file.value = null
    removed.value = true
    previewUrl.value = null
  }

  if (getCurrentScope()) onScopeDispose(releaseObjectUrl)

  return { file, previewUrl, removed, reset, choose, remove }
}
