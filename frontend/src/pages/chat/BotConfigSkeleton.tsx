import { useNavigate } from 'react-router-dom' // back navigation
import { type Bot } from '@services' // Bot entity type
import { BOT_TYPES, TYPE_BADGE } from '../../constants/botConstants' // type labels + badge classes
import { SkeletonRow } from './SkeletonRow' // animated placeholder row
import { SkeletonSection } from './SkeletonSection' // section grouping for skeleton rows

export function BotConfigSkeleton({ bot }: { bot: Bot }) { // shown when bot has no module scope or modules context is loading
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
        <button
          type="button"
          onClick={() => navigate('/bots')}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1"
          title="Back to bots"
        >
          ←
        </button>
        <span className="text-2xl">{bot.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white text-sm">{bot.name}</p>
          {bot.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{bot.description}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_BADGE[bot.type] ?? TYPE_BADGE.custom}`}>
          {BOT_TYPES.find(t => t.value === bot.type)?.label ?? bot.type}
        </span>
      </div>

      <div className="relative flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900 group rounded-b-xl">
        <SkeletonSection title="Principals">
          <SkeletonRow labelW="w-1/4" valueW="w-2/5" />
          <SkeletonRow labelW="w-1/3" valueW="flex-1" />
          <SkeletonRow labelW="w-1/5" valueW="w-1/2" />
        </SkeletonSection>

        <SkeletonSection title="Configurations">
          <SkeletonRow labelW="w-2/5" valueW="flex-1" />
          <SkeletonRow labelW="w-1/4" valueW="w-3/5" />
          <SkeletonRow labelW="w-1/3" valueW="flex-1" />
        </SkeletonSection>

        <SkeletonSection title="Processes">
          <SkeletonRow labelW="w-1/4" valueW="w-2/5" />
          <SkeletonRow labelW="w-2/5" valueW="flex-1" />
        </SkeletonSection>

        <SkeletonSection title="Scheduler">
          <SkeletonRow labelW="w-1/3" valueW="w-1/4" />
          <SkeletonRow labelW="w-1/4" valueW="w-2/5" />
        </SkeletonSection>

        <div className="absolute inset-0 rounded-b-xl bg-slate-900/50 dark:bg-slate-900/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="text-white font-semibold text-lg px-6 py-3 rounded-xl bg-slate-700/80">Coming soon</span>
        </div>
      </div>
    </div>
  )
}
