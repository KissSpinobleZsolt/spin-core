import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { useUIPrefs } from '../../context/UIPrefsContext'

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

interface NavItemProps {
  to: string
  end?: boolean
  icon: React.ReactNode
  label: string
  collapsed: boolean
}

function NavItem({ to, end, icon, label, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
          collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
        } ${
          isActive
            ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export default function Sidebar() {
  const { logout, user } = useAuth()
  const { t } = useTranslation()
  const { modules } = useSettings()
  const { sidebarCollapsed, toggleSidebar } = useUIPrefs()

  const collapsed = sidebarCollapsed

  const NAV_ITEMS = [
    {
      label: t('nav.dashboard'),
      to: '/',
      end: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
  ]

  const visibleModules = modules.filter(
    m => m.enabled && (!m.roles.length || m.roles.some(r => user?.roles.includes(r))),
  )

  const isAdmin = user?.roles.includes('admin')

  const settingsIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )

  const logoutIcon = (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )

  return (
    <aside
      className={`shrink-0 bg-slate-900 flex flex-col h-full transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand + toggle */}
      <div className="h-16 flex items-center border-b border-slate-700/60 px-3 gap-2">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">{t('sidebar.brand')}</p>
            <p className="text-xs text-slate-400 leading-tight truncate">{t('sidebar.tagline')}</p>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className={`shrink-0 p-1 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors outline outline-[0.1px] outline-[royalblue] -ml-[9px] ${
            collapsed ? 'mx-auto' : 'ml-auto'
          }`}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-1' : 'px-3'}`}>
        {!collapsed && (
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
            {t('sidebar.mainMenu')}
          </p>
        )}

        <div className={collapsed ? 'space-y-1' : 'space-y-1'}>
          {NAV_ITEMS.map(({ label, to, end, icon }) => (
            <NavItem key={to} to={to} end={end} icon={icon} label={label} collapsed={collapsed} />
          ))}
        </div>

        {/* Module entries */}
        {visibleModules.length > 0 && (
          <>
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-5 mb-3">
                {t('sidebar.modules')}
              </p>
            )}
            {collapsed && <div className="my-3 border-t border-slate-700/60" />}
            <div className="space-y-1">
              {visibleModules.map(m => (
                <NavItem
                  key={m.id}
                  to={`/modules/${m.id}`}
                  icon={<span className="text-base leading-none">{m.icon}</span>}
                  label={m.name}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </>
        )}

        {/* Admin settings link */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-5 mb-3">
                {t('sidebar.admin')}
              </p>
            )}
            {collapsed && <div className="my-3 border-t border-slate-700/60" />}
            <div className="space-y-1">
              <NavItem
                to="/settings"
                icon={settingsIcon}
                label={t('sidebar.settings')}
                collapsed={collapsed}
              />
            </div>
          </>
        )}
      </nav>

      {/* Bottom: sign out */}
      <div className={`border-t border-slate-700/60 pt-3 pb-4 ${collapsed ? 'px-1' : 'px-3'}`}>
        <button
          onClick={logout}
          title={collapsed ? t('sidebar.signOut') : undefined}
          className={`flex items-center gap-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full ${
            collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5 text-left'
          }`}
        >
          {logoutIcon}
          {!collapsed && <span>{t('sidebar.signOut')}</span>}
        </button>
      </div>
    </aside>
  )
}
