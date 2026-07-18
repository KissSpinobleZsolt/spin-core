import { type Bot } from '@services' // Bot entity shape
import { Badge } from '@components/ui/badge' // status badge
import { BOT_TYPES } from '@constants/botConstants' // bot type label map

export function BotHeader({ bot }: { bot: Bot }) { // displays icon + name + type badge
  return (
    <>
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none shrink-0">{bot.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white truncate">{bot.name}</p>
          <Badge variant={bot.type === 'communicator' ? 'info' : 'neutral'}>
            {BOT_TYPES.find(t => t.value === bot.type)?.label ?? bot.type}
          </Badge>
        </div>
      </div>
      {bot.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{bot.description}</p>
      )}
    </>
  )
}
