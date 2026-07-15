import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useHealth } from '../../context/HealthContext'

const ROUTE_KEYS: Record<string, string> = {
  '/': 'nav.dashboard',
  '/bots': 'nav.bots',
  '/settings': 'nav.settings',
  '/logs': 'nav.logs',
  '/translations': 'nav.translations',
  '/bots-admin': 'nav.botsAdmin',
  '/admin/llms': 'nav.llms',
  '/admin/users': 'nav.users',
  '/admin/modules': 'nav.modules',
  '/admin/status': 'nav.status',
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
  const health = useHealth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const degraded = health.checkedAt !== null && (!health.api || !health.postgres || !health.clickhouse)
  const statusLabel = !health.api
    ? 'API unreachable'
    : [
        !health.postgres && 'PostgreSQL',
        !health.clickhouse && 'ClickHouse',
      ].filter(Boolean).join(', ') + ' unreachable'

  const titleKey =
    ROUTE_KEYS[location.pathname] ??
    (location.pathname.startsWith('/bots/') ? 'nav.chat' :
     location.pathname.startsWith('/modules/') ? 'nav.modules' :
     'nav.dashboard')
  const initials = user ? getInitials(user.name) : '??'
  const displayName = user?.name ?? t('header.guest')
  const displayRole = user?.roles[0] ?? ''

  // Sync language when it changes in another tab
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'lang' && e.newValue && e.newValue !== i18n.language) {
        i18n.changeLanguage(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [i18n])

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

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
        {/* API / DB health indicator — only visible when degraded */}
        {degraded && (
          <div
            title={statusLabel}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium cursor-default"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            {!health.api ? 'API offline' : 'DB degraded'}
          </div>
        )}

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg px-2 py-1 transition-colors"
          >
            {/* Notification dot on avatar when there are notifications */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{displayName}</p>
              <p className="text-xs text-slate-400 leading-tight capitalize">{displayRole}</p>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-400 capitalize">{displayRole}</p>
              </div>

              {/* Notifications */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  {t('header.notifications')}
                </p>
                <p className="text-xs text-slate-400">{t('header.noNotifications')}</p>
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {t('header.toggleTheme')}
                </span>
                <span className="text-xs text-slate-400">{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>

              {/* Language switcher */}
              <button
                onClick={toggleLang}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  Language
                </span>
                <span className="text-xs font-semibold text-blue-500">
                  {i18n.language === 'en' ? 'EN' : 'RO'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
