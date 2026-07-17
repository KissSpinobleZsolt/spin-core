import { useQuery } from '@tanstack/react-query'
import { logsService, type ChatLogEntry } from '@services'
import type { TimeRange } from '@components/timeRangeFilter'
import { PAGE_SIZE } from './PAGE_SIZE.constant'

export function useChatLogs(page: number, timeRange: TimeRange, emailFilter: string) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['chat-logs', page, timeRange, emailFilter],
    queryFn: async () => {
      const result = await logsService.getChatLogs({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE, // Convert 1-indexed page to offset
        from: timeRange.from,
        to: timeRange.to,
        owner: emailFilter || undefined,
      })
      return { entries: result.items as ChatLogEntry[], total: result.total }
    },
    // Keep previous page data visible while a new page loads — prevents blank flash on pagination
    placeholderData: prev => prev,
  })

  return {
    entries: data?.entries ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
  }
}
