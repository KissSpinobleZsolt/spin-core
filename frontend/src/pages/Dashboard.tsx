import { useTranslation } from 'react-i18next'
import { useGet } from '../hooks/useApi'
import { dashboardService } from '@services'

export default function Dashboard() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useGet<string>(['dashboard'], dashboardService.getDashboard)

  if (isLoading) return <p className="p-6 text-slate-500">{t('dashboard.loading')}</p>
  if (isError) return <p className="p-6 text-red-500">{t('dashboard.error')}</p>

  return (
    <div className="p-6">
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{data}</p>
    </div>
  )
}
