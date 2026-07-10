import { useTranslation } from 'react-i18next'

export default function Reports() {
  const { t } = useTranslation()
  return (
    <div className="p-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
      {t('reports.title')}
    </div>
  )
}
