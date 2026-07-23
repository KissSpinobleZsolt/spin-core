import { logsService, type ModuleConfig } from '@services'
import { LogsDrawer } from '@components/logsDrawer'

// Thin wrapper — binds ModuleConfig to the shared LogsDrawer
export function ModuleLogsDrawer({ module: mod, onClose }: { module: ModuleConfig; onClose: () => void }) {
  return (
    <LogsDrawer
      name={mod.name}
      icon={mod.icon}
      subtitle={mod.scope}
      fetchLogs={params => logsService.getModuleLogs(mod.id, params)}
      onClose={onClose}
    />
  )
}
