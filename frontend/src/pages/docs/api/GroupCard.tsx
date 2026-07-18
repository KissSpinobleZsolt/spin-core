import type { ApiGroup } from './ApiGroup.type' // shape of the group prop
import { MethodBadge } from './MethodBadge' // coloured HTTP method badge
import { AUTH_CLS } from './AUTH_CLS.constant' // auth level → Tailwind colour class

// Renders one collapsible-style card showing all endpoints in an API group.
export function GroupCard({ group }: { group: ApiGroup }) {
  return (
    <div id={group.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h2 className="font-bold text-slate-800 dark:text-white">{group.title}</h2>
        {group.note && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{group.note}</p>
        )}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800">
        {group.endpoints.map((ep, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3">
            <MethodBadge method={ep.method} /> {/* coloured HTTP verb pill */}
            <code className="text-xs font-mono text-slate-700 dark:text-slate-200 pt-0.5 shrink-0 min-w-0 break-all">
              {ep.path}
            </code>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-600 dark:text-slate-300">{ep.description}</p>
            </div>
            <span className={`text-[10px] font-medium shrink-0 pt-0.5 ${AUTH_CLS[ep.auth]}`}>{ep.auth}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
