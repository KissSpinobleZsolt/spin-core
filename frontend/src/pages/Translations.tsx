import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { i18nService, type TranslationData } from '@services'
import { reloadTranslations } from '../i18n/useI18nSync'
import { Btn } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { PageTitle } from '../components/ui/PageTitle'

const LANGS = ['en', 'ro'] as const
type Lang = (typeof LANGS)[number]

// Flatten nested object: {nav: {dashboard: "x"}} → {"nav.dashboard": "x"}
function flatten(obj: TranslationData, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v as TranslationData, key))
    } else {
      result[key] = String(v ?? '')
    }
  }
  return result
}

// Unflatten: {"nav.dashboard": "x"} → {nav: {dashboard: "x"}}
function unflatten(flat: Record<string, string>): TranslationData {
  const result: TranslationData = {}
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.')
    let cur = result as Record<string, unknown>
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) {
        cur[parts[i]] = {}
      }
      cur = cur[parts[i]] as Record<string, unknown>
    }
    cur[parts[parts.length - 1]] = value
  }
  return result
}

type SaveState = 'idle' | 'saving' | 'saved'

export default function Translations() {
  const { t } = useTranslation()

  // flat maps per language
  const [data, setData] = useState<Record<Lang, Record<string, string>>>({ en: {}, ro: {} })
  const [original, setOriginal] = useState<Record<Lang, Record<string, string>>>({ en: {}, ro: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<Record<Lang, SaveState>>({ en: 'idle', ro: 'idle' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [en, ro] = await Promise.all([
          i18nService.getTranslations('en'),
          i18nService.getTranslations('ro'),
        ])
        const flat = { en: flatten(en), ro: flatten(ro) }
        setData(flat)
        setOriginal(flat)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // All unique keys from both languages, sorted
  const allKeys = useMemo(() => {
    const keys = new Set([...Object.keys(data.en), ...Object.keys(data.ro)])
    return Array.from(keys).sort()
  }, [data])

  const filteredKeys = useMemo(() => {
    if (!search.trim()) return allKeys
    const q = search.toLowerCase()
    return allKeys.filter(
      k => k.toLowerCase().includes(q) ||
           (data.en[k] ?? '').toLowerCase().includes(q) ||
           (data.ro[k] ?? '').toLowerCase().includes(q),
    )
  }, [allKeys, search, data])

  function handleChange(lang: Lang, key: string, value: string) {
    setData(prev => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }))
    setSaveState(prev => ({ ...prev, [lang]: 'idle' }))
  }

  async function handleSave(lang: Lang) {
    setSaveState(prev => ({ ...prev, [lang]: 'saving' }))
    try {
      await i18nService.saveTranslations(lang, unflatten(data[lang]))
      await reloadTranslations(lang)
      setOriginal(prev => ({ ...prev, [lang]: { ...data[lang] } }))
      setSaveState(prev => ({ ...prev, [lang]: 'saved' }))
      setTimeout(() => setSaveState(prev => ({ ...prev, [lang]: 'idle' })), 2000)
    } catch (e) {
      setError(String(e))
      setSaveState(prev => ({ ...prev, [lang]: 'idle' }))
    }
  }

  function isDirty(lang: Lang) {
    return JSON.stringify(data[lang]) !== JSON.stringify(original[lang])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Loading…
      </div>
    )
  }

  return (
    <div className="space-y-4">
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

      {error && <ErrorBanner message={error} />}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
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
              <div key={key} className="grid grid-cols-[2fr_3fr_3fr] gap-0 group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
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
      </div>
    </div>
  )
}
