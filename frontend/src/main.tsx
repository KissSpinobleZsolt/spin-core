import { registerSW } from 'virtual:pwa-register'
import { StrictMode } from 'react'

// Re-registers whenever the user reloads; autoUpdate in vite.config handles silent updates
registerSW({ immediate: true })
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'
import { UIPrefsProvider } from './context/UIPrefsContext'
import { HealthProvider } from './context/HealthContext'
import { ModelStatusProvider } from './context/ModelStatusContext'
import { NotificationProvider } from './context/NotificationContext'
import './i18n'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <UIPrefsProvider>
            <SettingsProvider>
              <HealthProvider>
                <ModelStatusProvider>
                  <NotificationProvider>
                    <App />
                  </NotificationProvider>
                </ModelStatusProvider>
              </HealthProvider>
            </SettingsProvider>
          </UIPrefsProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
