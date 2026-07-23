import { logsService, type Bot } from '@services'
import { LogsDrawer } from '@components/logsDrawer'

// Thin wrapper — binds Bot to the shared LogsDrawer
export function BotLogsDrawer({ bot, onClose }: { bot: Bot; onClose: () => void }) {
  return (
    <LogsDrawer
      name={bot.name}
      icon={bot.icon}
      subtitle={bot.type}
      fetchLogs={params => logsService.getBotLogs(bot.id, params)}
      onClose={onClose}
    />
  )
}
