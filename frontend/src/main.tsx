import { registerSW } from 'virtual:pwa-register'
import { StrictMode } from 'react'

// Re-registers whenever the user reloads; autoUpdate in vite.config handles silent updates
registerSW({ immediate: true })
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './store'   // execute store modules early — reads localStorage and applies theme/prefs before first paint
import './i18n'    // initialise the i18next instance with the persisted language before any component renders
import './index.css'
import App from './app'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,  // treat data as fresh for 30 s to avoid redundant background refetches on tab focus
      retry: 1,  // retry once on network errors before surfacing them to the UI
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* No auth/UI providers here — auth state is in Zustand (useAuthStore), no provider needed.
          All authenticated data connections are managed by useBootstrap() inside AuthGuard. */}
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// Remove the splash screen once React has committed its first render to the DOM
requestAnimationFrame(() => {
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.classList.add('fade-out')                       // trigger CSS opacity transition
  splash.addEventListener('transitionend', () => splash.remove(), { once: true })  // clean up the DOM node after fade completes
})
