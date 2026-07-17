import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, useSettings, useUIPrefs } from '@context'

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

function OfflineModuleItem({ icon, label, collapsed }: { icon: string; label: string; collapsed: boolean }) {
  return (
    <div
      title={collapsed ? `${label} (offline)` : undefined}
      className={`flex items-center gap-3 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed select-none ${
        collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
      } text-slate-500`}
    >
      <span className="shrink-0 text-base leading-none">{icon}</span>
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-400 shrink-0">offline</span>
        </>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { logout, user } = useAuth()
  const { t } = useTranslation()
  const { modules, moduleReachability } = useSettings()
  const { sidebarCollapsed, toggleSidebar } = useUIPrefs()

  const collapsed = sidebarCollapsed

  const systemModule = modules.find(m => m.scope === 'system')

  const dashboardIcon = systemModule ? (
    <span className="text-base leading-none">{systemModule.icon}</span>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )

  const NAV_ITEMS = [
    {
      label: systemModule?.name ?? t('nav.dashboard'),
      to: '/',
      end: true,
      icon: dashboardIcon,
    },
    {
      label: 'Bots',
      to: '/bots',
      end: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2M9 3a1 1 0 001 1h4a1 1 0 001-1M9 3a1 1 0 011-1h4a1 1 0 011 1m-6 8h.01M15 11h.01M12 16v-5" />
        </svg>
      ),
    },
  ]

  // system scope is excluded here — it is rendered as the fixed dashboard nav item above,
  // not as a dynamic module entry, so showing it twice would be wrong
  const visibleModules = modules.filter(
    m => m.enabled && m.scope !== 'system' && (!m.roles.length || m.roles.some(r => user?.roles.includes(r))),
  )

  const isAdmin = user?.roles.includes('admin')

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
              {visibleModules.map(m =>
                moduleReachability[m.id] === false ? (
                  <OfflineModuleItem key={m.id} icon={m.icon} label={m.name} collapsed={collapsed} />
                ) : (
                  <NavItem
                    key={m.id}
                    to={`/modules/${m.id}`}
                    icon={<span className="text-base leading-none">{m.icon}</span>}
                    label={m.name}
                    collapsed={collapsed}
                  />
                )
              )}
            </div>
          </>
        )}

        {/* Admin section */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-5 mb-3">
                {t('sidebar.admin')}
              </p>
            )}
            {collapsed && <div className="my-3 border-t border-slate-700/60" />}
            <div className="space-y-1">
              {/* LLMs */}
              <NavItem
                to="/admin/llms"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                label="LLMs"
                collapsed={collapsed}
              />
              {/* Bots admin */}
              <NavItem
                to="/bots-admin"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M8 9h8M8 13h5m-1 8H6a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v13a2 2 0 01-2 2z" />
                  </svg>
                }
                label="Bots"
                collapsed={collapsed}
              />
              <NavItem
                to="/admin/modules"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                }
                label="Modules"
                collapsed={collapsed}
              />

              {/* Configs sub-group */}
              {!collapsed && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mt-4 mb-2">
                  Configs
                </p>
              )}
              {collapsed && <div className="my-2 mx-2 border-t border-slate-700/40" />}
              <div className={collapsed ? '' : 'pl-2 space-y-1'}>
                <NavItem
                  to="/translations"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  }
                  label={t('sidebar.translations')}
                  collapsed={collapsed}
                />
                <NavItem
                  to="/logs"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  label={t('sidebar.logs')}
                  collapsed={collapsed}
                />
                <NavItem
                  to="/admin/status"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                  label="Status"
                  collapsed={collapsed}
                />
              </div>

              {/* Utils sub-group */}
              {!collapsed && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mt-4 mb-2">
                  Utils
                </p>
              )}
              {collapsed && <div className="my-2 mx-2 border-t border-slate-700/40" />}
              <div className={collapsed ? '' : 'pl-2 space-y-1'}>
                <NavItem
                  to="/admin/layouts"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
                    </svg>
                  }
                  label="Layouts"
                  collapsed={collapsed}
                />
              </div>

              {/* Docs sub-group */}
              {!collapsed && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mt-4 mb-2">
                  Docs
                </p>
              )}
              {collapsed && <div className="my-2 mx-2 border-t border-slate-700/40" />}
              <div className={collapsed ? '' : 'pl-2 space-y-1'}>
                <NavItem
                  to="/admin/docs/ui"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v10m0 0h10M9 13H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2z" />
                    </svg>
                  }
                  label="UI"
                  collapsed={collapsed}
                />
                <NavItem
                  to="/admin/docs/api"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  }
                  label="API"
                  collapsed={collapsed}
                />
                <NavItem
                  to="/admin/docs/deployment"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  }
                  label="Deployment"
                  collapsed={collapsed}
                />
              </div>
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
