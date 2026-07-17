import { RouterProvider } from 'react-router-dom'
import { router } from './router.config'
import { CookieConsentModal } from '../components/CookieConsentModal'
import { useI18nSync } from '../i18n/useI18nSync'
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
