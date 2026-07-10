import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="h-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <p className="text-xs text-slate-400">
        {t('footer.copyright', { year })}
      </p>
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-300">v1.0.0</span>
        <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t('footer.status')}
        </span>
      </div>
    </footer>
  )
}
