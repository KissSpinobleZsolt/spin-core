import type { ReactNode } from 'react'

/** Sidebar item rendered for a module whose remote container is unreachable. */
export function OfflineModuleItem({ icon, label, collapsed }: { icon: ReactNode; label: string; collapsed: boolean }) {
  return (
    <div
      title={collapsed ? `${label} (offline)` : undefined}
      className={`flex items-center gap-3 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed select-none ${
        collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
      } text-slate-500`}
    >
      <span className="shrink-0 w-5 h-5 flex items-center justify-center text-base leading-none">{icon}</span>
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-400 shrink-0">offline</span>
        </>
      )}
    </div>
  )
}
