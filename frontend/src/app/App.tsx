import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { CookieConsentModal } from '../components/cookieConsent'

// i18n and theme initialisation moved to Layout — both now only run after the user is authenticated
export default function App() {
  return (
    <>
      <RouterProvider router={router} />  {/* renders the matched route tree; unauthenticated routes skip Layout */}
      <CookieConsentModal />  {/* rendered outside RouterProvider so it appears before login */}
    </>
  )
}
