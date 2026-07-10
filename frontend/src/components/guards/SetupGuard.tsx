import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { setupService } from '../../services/setupService'

type Status = 'loading' | 'complete' | 'incomplete'

let cachedStatus: Status | null = null

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(cachedStatus ?? 'loading')
  const location = useLocation()

  useEffect(() => {
    if (cachedStatus) return
    setupService.getStatus().then(({ setup_complete }) => {
      const s: Status = setup_complete ? 'complete' : 'incomplete'
      cachedStatus = s
      setStatus(s)
    })
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'incomplete' && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  if (status === 'complete' && location.pathname === '/setup') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
