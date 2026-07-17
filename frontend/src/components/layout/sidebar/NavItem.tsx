import { NavLink } from 'react-router-dom'
import type { NavItemProps } from './NavItemProps.type'

export function NavItem({ to, end, icon, label, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined} // Show tooltip when collapsed so label is accessible
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
