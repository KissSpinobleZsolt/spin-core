import { useTranslation } from 'react-i18next'
import { useAuth, useSettings, useUIPrefs } from '@context'
import { ChevronLeftIcon } from './ChevronLeftIcon'
import { ChevronRightIcon } from './ChevronRightIcon'
import { NavItem } from './NavItem'
import { OfflineModuleItem } from './OfflineModuleItem'
const IMAGE_ICON_RE = /\.(webp|png|svg|jpg|jpeg|ico)$/i // extensions that indicate a file-based icon

/**
 * Renders a module icon as an <img> when the icon field is a filename or URL,
 * or as a plain emoji <span> for backward-compatible text icons.
 * Relative filenames are resolved against the module's remote_url base so the
 * icon stays correct across dev / prod deployments without hardcoding a host.
 */
function ModuleIcon({ icon, remoteUrl }: { icon: string; remoteUrl: string }) {
  let src: string | null = null
  if (IMAGE_ICON_RE.test(icon) && !icon.startsWith('http') && !icon.startsWith('/')) {
    const base = remoteUrl.replace(/\/remoteEntry\.js.*$/, '') // strip filename, keep origin + path
    src = `${base}/${icon}`
  } else if (icon.startsWith('http') || icon.startsWith('/')) {
    src = icon // already a fully-qualified or root-relative URL
  }
  if (src) return <img src={src} alt="" className="w-5 h-5 object-contain rounded-sm" />
  return <span className="text-base leading-none">{icon}</span> // emoji / text fallback
}

export default function Sidebar() {
  const { logout, user } = useAuth()
  const { t } = useTranslation()
  const { modules, moduleReachability } = useSettings()
  const { sidebarCollapsed, toggleSidebar } = useUIPrefs()

  const collapsed = sidebarCollapsed

  const systemModule = modules.find(m => m.scope === 'system') // the built-in Dashboard entry

  const dashboardIcon = systemModule ? (
    <ModuleIcon icon={systemModule.icon} remoteUrl={systemModule.remote_url} />
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )

  const NAV_ITEMS = [
    {
      label: t('nav.dashboard'),
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

  // system scope excluded — rendered as the fixed dashboard nav item above
  const visibleModules = modules.filter(
    m => m.enabled && m.scope !== 'system' && (!m.roles.length || m.roles.some(r => user?.roles.includes(r))),
  )

  // Split into role groups — determines sidebar section ordering: user → admin → system
  const userModules   = visibleModules.filter(m => !m.roles.includes('admin') && !m.roles.includes('system'))
  const adminModules  = visibleModules.filter(m => m.roles.includes('admin')  && !m.roles.includes('system'))
  const systemModules = visibleModules.filter(m => m.roles.includes('system'))

  const isAdmin  = user?.roles.includes('admin')
  const isSystem = user?.roles.includes('system')

  const logoutIcon = (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )

  /** Renders a group of modules (user/admin/system) with online/offline handling. */
  const renderModuleGroup = (mods: typeof visibleModules) =>
    mods.map(m =>
      moduleReachability[m.id] === false ? (
        <OfflineModuleItem
          key={m.id}
          icon={<ModuleIcon icon={m.icon} remoteUrl={m.remote_url} />}
          label={m.name}
          collapsed={collapsed}
        />
      ) : (
        <NavItem
          key={m.id}
          to={`/modules/${m.id}`}
          icon={<ModuleIcon icon={m.icon} remoteUrl={m.remote_url} />}
          label={m.name}
          collapsed={collapsed}
        />
      )
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

        {/* ── Group 1: User modules ─────────────────────────── */}
        {userModules.length > 0 && (
          <>
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-5 mb-3">
                {t('sidebar.modules')}
              </p>
            )}
            {collapsed && <div className="my-3 border-t border-slate-700/60" />}
            <div className="space-y-1">
              {renderModuleGroup(userModules)}
            </div>
          </>
        )}

        {/* ── Group 2: Admin section ────────────────────────── */}
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
              <NavItem
                to="/admin/bots"
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
                  to="/admin/logs"
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

              {/* Admin-role DB modules (e.g. admin-only federation remotes) */}
              {adminModules.length > 0 && (
                <>
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mt-4 mb-2">
                      Modules
                    </p>
                  )}
                  {collapsed && <div className="my-2 mx-2 border-t border-slate-700/40" />}
                  <div className={collapsed ? 'space-y-1' : 'pl-2 space-y-1'}>
                    {renderModuleGroup(adminModules)}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Group 3: System section ───────────────────────── */}
        {isSystem && (
          <>
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-5 mb-3">
                System
              </p>
            )}
            {collapsed && <div className="my-3 border-t border-slate-700/60" />}
            <div className="space-y-1">
              {renderModuleGroup(systemModules)}
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
