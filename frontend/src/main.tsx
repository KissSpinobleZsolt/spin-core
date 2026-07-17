import { registerSW } from 'virtual:pwa-register'
import { StrictMode } from 'react'

// Re-registers whenever the user reloads; autoUpdate in vite.config handles silent updates
registerSW({ immediate: true })
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  AuthProvider,
  SettingsProvider,
  UIPrefsProvider,
  HealthProvider,
  ModelStatusProvider,
  NotificationProvider,
} from '@context'
import './store'   // execute store modules early — theme.store.ts reads localStorage and sets the dark class before first paint
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
      <AuthProvider>  {/* outermost — all providers below can read the JWT token and user object */}
        <UIPrefsProvider>  {/* reads/writes sidebar-collapsed state from localStorage */}
          <SettingsProvider>  {/* polls GET /api/settings/modules for the live module list */}
            <HealthProvider>  {/* runs the health Web Worker; exposes DB/Ollama liveness + translation versions */}
              <ModelStatusProvider>  {/* streams Ollama model download progress via SSE */}
                <NotificationProvider>  {/* opens a WebSocket for real-time platform notifications */}
                  <App />
                </NotificationProvider>
              </ModelStatusProvider>
            </HealthProvider>
          </SettingsProvider>
        </UIPrefsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
