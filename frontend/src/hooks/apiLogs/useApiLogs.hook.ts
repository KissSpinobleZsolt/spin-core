import { useQuery } from '@tanstack/react-query'
import { logsService } from '@services'
import type { TimeRange } from '@components/timeRangeFilter'
import { PAGE_SIZE } from './PAGE_SIZE.constant'
import type { ApiLogsResult } from './ApiLogsResult.type'

export function useApiLogs(
  page: number,
  timeRange: TimeRange,
  eventTypeFilter: string,
  ownerFilter: string,
  levelFilter: string,
) {
  const { data, isLoading, isError } = useQuery<ApiLogsResult>({
    queryKey: ['api-logs', page, timeRange, eventTypeFilter, ownerFilter, levelFilter],
    queryFn: async () => {
      const [logsResult, summaryResult] = await Promise.all([
        logsService.getLogs({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE, // Convert 1-indexed page to offset
          event_type: eventTypeFilter || undefined,
          owner: ownerFilter || undefined,
          level: levelFilter || undefined,
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
