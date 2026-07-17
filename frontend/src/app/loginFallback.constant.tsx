import { Spinner } from '../components/ui/spinner'

// Stable JSX node — module-scope so React never recreates it between renders
export const loginFallback = (
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <Spinner size="lg" />
  </div>
)
