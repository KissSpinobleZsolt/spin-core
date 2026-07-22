import { useQuery } from '@tanstack/react-query'
import { logsService, type UserLogEntry } from '@services'
import type { TimeRange } from '@components/timeRangeFilter'
import { PAGE_SIZE } from './PAGE_SIZE.constant'

export function useUserLogs(page: number, timeRange: TimeRange, ownerFilter: string, levelFilter: string) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-logs', page, timeRange, ownerFilter, levelFilter],
    queryFn: async () => {
      const result = await logsService.getUserLogs({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE, // Convert 1-indexed page to offset
        owner: ownerFilter || undefined,
        level: levelFilter || undefined,
        from: timeRange.from,
        to: timeRange.to,
      })
      return { logs: result.items as UserLogEntry[], total: result.total }
    },
    // Keep previous page data visible while a new page loads — prevents blank flash on pagination
    placeholderData: prev => prev,
  })

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
  }
}
