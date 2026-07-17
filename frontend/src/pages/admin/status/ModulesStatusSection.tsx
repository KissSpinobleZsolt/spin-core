import { useSettings } from '@context' // module list from settings context
import { Badge } from '../../../components/ui/badge' // active/disabled badge
import { SectionCard } from './SectionCard' // section wrapper

export function ModulesStatusSection() { // shows enabled vs total module counts
  const { modules } = useSettings()
  const installed = modules.length // total registered modules
  const active = modules.filter(m => m.enabled).length // currently enabled modules

  return (
    <SectionCard title="Modules" navigateTo="/admin/modules">
      {installed === 0 ? (
        <p className="text-sm text-slate-500">No modules configured.</p>
      ) : (
        <div className="space-y-2">
          {modules.map(m => (
            <div key={m.id} className="flex items-center gap-3 text-sm">
              <span className="text-lg w-7 shrink-0">{m.icon}</span>
              <span className="font-medium text-slate-800 dark:text-white flex-1 truncate">{m.name}</span>
              <span className="font-mono text-xs text-slate-400">/modules/{m.id}</span>
              <Badge variant={m.enabled ? 'success' : 'neutral'}>
                {m.enabled ? 'active' : 'disabled'}
              </Badge>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">{active} active of {installed} installed</p>
    </SectionCard>
  )
}
