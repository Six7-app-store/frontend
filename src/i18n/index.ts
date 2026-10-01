import { createI18n } from 'vue-i18n'

import de from './locales/de'
import en from './locales/en'
import { LOCALE_STORAGE_KEY } from '@/utils/storage-keys'

const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) || 'de'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    de,
    en,
  },
})

export default i18n
