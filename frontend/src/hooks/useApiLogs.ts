import { useQuery } from '@tanstack/react-query'
import { logsService, type LogEntry, type SummaryEntry } from '@services'
import type { TimeRange } from '@components/timeRangeFilter'

const PAGE_SIZE = 50

interface ApiLogsResult {
  logs: LogEntry[]
  total: number
  summary: SummaryEntry[]
}

export function useApiLogs(
  page: number,
  timeRange: TimeRange,
  eventTypeFilter: string,
  ownerFilter: string,
) {
  const { data, isLoading, isError } = useQuery<ApiLogsResult>({
    queryKey: ['api-logs', page, timeRange, eventTypeFilter, ownerFilter],
    queryFn: async () => {
      const [logsResult, summaryResult] = await Promise.all([
        logsService.getLogs({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          event_type: eventTypeFilter || undefined,
          owner: ownerFilter || undefined,
          from: timeRange.from,
          to: timeRange.to,
        }),
        logsService.getSummary({
          from: timeRange.from,
          to: timeRange.to,
          event_type: eventTypeFilter || undefined,
          limit: 1000,
        }),
      ])
      return { logs: logsResult.items, total: logsResult.total, summary: summaryResult.items }
    },
    // Keep previous page data visible while a new page loads — prevents blank flash on pagination
    placeholderData: prev => prev,
  })

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    summary: data?.summary ?? [],
    isLoading,
    isError,
  }
}
