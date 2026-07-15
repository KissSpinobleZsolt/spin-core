import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const stored = localStorage.getItem('lang')
const defaultLang = stored === 'ro' ? 'ro' : 'en'

i18n.use(initReactI18next).init({
  resources: {},
  lng: defaultLang,
  fallbackLng: false,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
