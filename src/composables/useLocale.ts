import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LOCALE_STORAGE_KEY } from '@/utils/storage-keys'

export type Locale = 'de' | 'en'

/** The UI language; setting it also remembers the choice in the browser. */
export function useLocale() {
  const { locale: active } = useI18n()

  const locale = computed<Locale>({
    get: () => (active.value === 'en' ? 'en' : 'de'),
    set: (next) => {
      active.value = next
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next)
      } catch {
        // Storage unavailable (private mode, blocked): the choice lasts for this page.
      }
    },
  })

  return { locale }
}
