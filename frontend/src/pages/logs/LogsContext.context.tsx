import { useState, createContext, useContext, type ReactNode, createElement } from 'react' // context primitives
import { useSearchParams } from 'react-router-dom' // tab state synced to URL
import { logsService } from '@services' // purge endpoint
import { defaultTimeRange, type TimeRange } from '@components/timeRangeFilter' // shared time range type
import { type Tab } from './Tab.type' // logs tab type

interface LogsContextValue { // shared state consumed by all Logs sub-components
  tab: Tab
  setTab: (t: Tab) => void
  timeRange: TimeRange
  setTimeRange: (r: TimeRange) => void
  purging: boolean
  purgeResult: { purged: string[]; errors: string[] } | null
  handlePurge: () => void
}

const LogsContext = createContext<LogsContextValue | null>(null) // context instance

export function useLogsContext() { // must be used inside <LogsProvider>
  const ctx = useContext(LogsContext)
  if (!ctx) throw new Error('useLogsContext must be used inside <LogsProvider>')
  return ctx
}

export function LogsProvider({ children }: { children: ReactNode }) { // provides tab, time range, and purge state to all log tabs
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab | null) ?? 'api' // default to API tab

  function setTab(t: Tab) {
    // replace:true — tab switches should not add history entries; back button would otherwise step through each tab
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab', t); return n }, { replace: true })
  }

  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<{ purged: string[]; errors: string[] } | null>(null)

  async function handlePurge() { // force-expires all ClickHouse log TTLs
    setPurging(true)
    setPurgeResult(null)
    try {
      const result = await logsService.purgeExpiredLogs()
      setPurgeResult(result)
    } finally {
      setPurging(false)
    }
  }

  return createElement(
    LogsContext.Provider,
    { value: { tab, setTab, timeRange, setTimeRange, purging, purgeResult, handlePurge } },
    children,
  )
}
