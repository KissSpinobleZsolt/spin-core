import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { TranslationsProvider, useTranslationsContext, LANGS } from '@hooks/useTranslations'
import { Card } from '@components/ui/Card'
import { Btn } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { ErrorBanner } from '@components/ui/ErrorBanner'
import { PageTitle } from '@components/ui/PageTitle'
import { PageSkeletonLoader } from '@components/layout/PageSkeletonLoader'

// ─── Sub-components (subscribe to TranslationsProvider) ──────────────────────

function TranslationsToolbar() {
  const { t } = useTranslation()
  const { search, setSearch, saveState, handleSave, isDirty } = useTranslationsContext()
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <PageTitle>{t('translations.title')}</PageTitle>
      <div className="flex-1 min-w-48">
        <Input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('translations.search')}
        />
      </div>
      <div className="flex gap-2 ml-auto">
        {LANGS.map(lang => (
          <Btn
            key={lang}
            type="button"
            onClick={() => handleSave(lang)}
            disabled={saveState[lang] === 'saving' || !isDirty(lang)}
            className="flex items-center gap-2"
          >
            {saveState[lang] === 'saving'
              ? t('translations.saving')
              : saveState[lang] === 'saved'
              ? t('translations.saved')
              : `${t('translations.save')} ${lang.toUpperCase()}`}
            {isDirty(lang) && saveState[lang] === 'idle' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            )}
          </Btn>
        ))}
      </div>
    </div>
  )
}

function TranslationsGrid() {
  const { t } = useTranslation()
  const { data, filteredKeys, handleChange } = useTranslationsContext()
  return (
    <Card noPadding>
      <div className="grid grid-cols-[2fr_3fr_3fr] gap-0 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Key</div>
        <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 border-l border-slate-200 dark:border-slate-700">EN</div>
        <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 border-l border-slate-200 dark:border-slate-700">RO</div>
      </div>
      {filteredKeys.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          {t('translations.noResults')}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[calc(100vh-240px)] overflow-y-auto">
          {filteredKeys.map(key => (
            <div
              key={key}
              className="grid grid-cols-[2fr_3fr_3fr] gap-0 group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <div className="px-4 py-2 flex items-center">
                <code className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all leading-tight">
                  {key}
                </code>
              </div>
              {LANGS.map(lang => (
                <div key={lang} className="px-2 py-1.5 border-l border-slate-100 dark:border-slate-700/60">
                  <textarea
                    rows={1}
                    value={data[lang][key] ?? ''}
                    onChange={e => handleChange(lang, key, e.target.value)}
                    className="w-full px-2 py-1 text-sm rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white resize-none leading-snug focus:outline-none transition-colors"
                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function TranslationsContent() {
  const { error } = useTranslationsContext()
  return (
    <div className="space-y-4">
      <TranslationsToolbar />
      {error && <ErrorBanner message={error} />}
      <TranslationsGrid />
    </div>
  )
}

// ─── Page shell ──────────────────────────────────────────────────────────────

export default function Translations() {
  return (
    // Suspense must wrap Provider (not vice versa): TranslationsProvider calls useSuspenseQuery
    // which throws a Promise — Suspense must be the nearest ancestor outside the thrower to catch it.
    <Suspense fallback={<PageSkeletonLoader config={{ type: 'table', columns: 3, rows: 8 }} />}>
      <TranslationsProvider>
        <TranslationsContent />
      </TranslationsProvider>
    </Suspense>
  )
}
