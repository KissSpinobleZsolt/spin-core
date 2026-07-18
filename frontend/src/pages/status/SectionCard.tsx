import { useNavigate } from 'react-router-dom' // navigate to related admin pages

export function SectionCard({ // reusable card with optional nav link title
  title,
  navigateTo,
  children,
}: {
  title: string
  navigateTo?: string
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        {navigateTo ? (
          <button
            type="button"
            onClick={() => navigate(navigateTo)}
            className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {title}
            <span className="text-sm">›</span>
          </button>
        ) : (
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
        )}
      </div>
      {children}
    </div>
  )
}
