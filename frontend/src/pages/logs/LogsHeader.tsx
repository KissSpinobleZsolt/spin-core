import { Btn } from '../../components/ui/button' // purge button
import { PageTitle } from '../../components/ui/PageTitle' // page heading
import { useLogsContext } from './LogsContext.context' // purge state + handler

export function LogsHeader() { // page title row with purge action and result feedback
  const { purging, purgeResult, handlePurge } = useLogsContext()
  return (
    <div className="flex items-center justify-between">
      <PageTitle>Logs</PageTitle>
      <div className="flex items-center gap-3">
        {purgeResult && (
          <span className={`text-xs ${purgeResult.errors.length ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
            {purgeResult.errors.length
              ? `${purgeResult.purged.length} purged, ${purgeResult.errors.length} error(s)`
              : `${purgeResult.purged.length} table(s) purged`}
          </span>
        )}
        <Btn variant="secondary" disabled={purging} onClick={handlePurge}>
          {purging ? 'Purging…' : 'Purge expired logs'}
        </Btn>
      </div>
    </div>
  )
}
