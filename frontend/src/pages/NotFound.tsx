import { useNavigate } from 'react-router-dom'
import { Btn } from '@components/ui/button'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 py-24">
      <span className="text-7xl font-bold text-slate-700 select-none">404</span>
      <p className="text-lg font-medium text-slate-300">Page not found</p>
      <p className="text-sm text-slate-500">The page you're looking for doesn't exist or was moved.</p>
      <Btn variant="secondary" onClick={() => navigate('/')} className="mt-2">
        Go to dashboard
      </Btn>
    </div>
  )
}
