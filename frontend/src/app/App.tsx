import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { CookieConsentModal } from '../components/cookieConsent'
import { useI18nSync } from '../i18n/i18nSync'
import { loginFallback } from './loginFallback.constant'

export default function App() {
  const i18nReady = useI18nSync() // blocks render until translation strings are loaded
  if (!i18nReady) return loginFallback // reuse the same stable spinner shown during route lazy-loads
  return (
    <>
      <RouterProvider router={router} />
      <CookieConsentModal />
    </>
  )
}
