import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const ROUTE_KEYS: Record<string, string> = {
  '/': 'nav.dashboard',
  '/upload': 'nav.upload',
  '/chat': 'nav.chat',
  '/reports': 'nav.reports',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Header() {
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [notifOpen, setNotifOpen] = useState(false)

  const titleKey = ROUTE_KEYS[location.pathname] ?? 'nav.dashboard'
  const initials = user ? getInitials(user.name) : '??'
  const displayName = user?.name ?? t('header.guest')
  const displayRole = user?.roles[0] ?? ''

  function toggleLang() {
    const next = i18n.language === 'en' ? 'ro' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Page title */}
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t(titleKey)}</h1>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Language switcher */}
        <button
          onClick={toggleLang}
          className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors tracking-wide"
          aria-label="Switch language"
        >
          {i18n.language === 'en' ? 'RO' : 'EN'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={t('header.toggleTheme')}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-50">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('header.notifications')}</p>
              <p className="text-xs text-slate-400">{t('header.noNotifications')}</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

        {/* Avatar */}
        <button className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg px-2 py-1 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{displayName}</p>
            <p className="text-xs text-slate-400 leading-tight capitalize">{displayRole}</p>
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </header>
  )
}
