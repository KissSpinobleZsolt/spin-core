import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'
import ro from './locales/ro'

const stored = localStorage.getItem('lang')
const defaultLang = stored === 'ro' ? 'ro' : 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ro: { translation: ro },
  },
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
