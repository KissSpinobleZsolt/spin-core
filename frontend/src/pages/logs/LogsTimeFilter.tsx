import TimeRangeFilter from '@components/timeRangeFilter' // time range selector component
import { useLogsContext } from './LogsContext.context' // shared time range state

export function LogsTimeFilter() { // renders time range picker wired to the shared logs context
  const { timeRange, setTimeRange } = useLogsContext()
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
    </div>
  )
}
