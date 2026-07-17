import { botsService, type Bot } from '@services' // bots list and Bot type
import { useGet } from '@hooks' // data fetch hook
import { Spinner } from '../../../components/ui/spinner' // loading indicator
import { SectionCard } from './SectionCard' // section wrapper

export function ActiveBotsSection() { // shows active bots with model info
  const { data, isLoading } = useGet<Bot[]>(
    ['status-bots'],
    () => botsService.getBots(),
  )

  const activeBots = data?.filter(b => b.active) ?? [] // only active bots shown here

  return (
    <SectionCard title="Active Bots" navigateTo="/bots-admin">
      {isLoading && <Spinner size="sm" />}
      {!isLoading && activeBots.length === 0 && (
        <p className="text-sm text-slate-500">No active bots.</p>
      )}
      {activeBots.length > 0 && (
        <div className="space-y-2">
          {activeBots.map(b => (
            <div key={b.id} className="flex items-center gap-3 text-sm">
              <span className="text-lg w-7 shrink-0">{b.icon}</span>
              <span className="font-medium text-slate-800 dark:text-white flex-1 truncate">{b.name}</span>
              <span className="text-xs text-slate-400 shrink-0">{b.type}</span>
              <span className="font-mono text-xs text-slate-400 shrink-0 truncate max-w-[12rem]">{b.model}</span>
            </div>
          ))}
        </div>
      )}
      {data && (
        <p className="text-xs text-slate-400">{activeBots.length} active of {data.length} total</p>
      )}
    </SectionCard>
  )
}
