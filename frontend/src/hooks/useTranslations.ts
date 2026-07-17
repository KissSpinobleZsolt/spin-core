/** @module hooks/useTranslations — Translation editor state with a subscribable context provider. */
import { useState, useMemo, createContext, useContext, type ReactNode, createElement } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { i18nService } from '@services'
import { reloadTranslations } from '../i18n/useI18nSync'
import { flatten, unflatten } from '@utils'

export const LANGS = ['en', 'ro'] as const
export type Lang = (typeof LANGS)[number]

type SaveState = 'idle' | 'saving' | 'saved'

// ─── Hook ────────────────────────────────────────────────────────────────────

function useTranslations() {
  // useSuspenseQuery guarantees data is defined — Suspense shows the skeleton until both resolve
  const { data: rawEn } = useSuspenseQuery({
    queryKey: ['translations', 'en'],
    queryFn: () => i18nService.getTranslations('en'),
    staleTime: 5 * 60 * 1000,
  })
  const { data: rawRo } = useSuspenseQuery({
    queryKey: ['translations', 'ro'],
    queryFn: () => i18nService.getTranslations('ro'),
    staleTime: 5 * 60 * 1000,
  })

  // Lazy initialisers run after Suspense resolves, so rawEn/rawRo are present on first render
  const [data, setData] = useState<Record<Lang, Record<string, string>>>(() => ({
    en: flatten(rawEn),
    ro: flatten(rawRo),
  }))
  const [original, setOriginal] = useState<Record<Lang, Record<string, string>>>(() => ({
    en: flatten(rawEn),
    ro: flatten(rawRo),
  }))
  const [saveState, setSaveState] = useState<Record<Lang, SaveState>>({ en: 'idle', ro: 'idle' })
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const allKeys = useMemo(() => {
    const keys = new Set([...Object.keys(data.en), ...Object.keys(data.ro)])
    return Array.from(keys).sort()
  }, [data])

  const filteredKeys = useMemo(() => {
    if (!search.trim()) return allKeys
    const q = search.toLowerCase()
    return allKeys.filter(
      k =>
        k.toLowerCase().includes(q) ||
        (data.en[k] ?? '').toLowerCase().includes(q) ||
        (data.ro[k] ?? '').toLowerCase().includes(q),
    )
  }, [allKeys, search, data])

  function handleChange(lang: Lang, key: string, value: string) {
    setData(prev => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }))
    setSaveState(prev => ({ ...prev, [lang]: 'idle' }))
  }

  async function handleSave(lang: Lang) {
    setError(null)
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

  return { data, error, search, setSearch, saveState, filteredKeys, handleChange, handleSave, isDirty }
}

// ─── Context & Provider ───────────────────────────────────────────────────────

type TranslationsContextValue = ReturnType<typeof useTranslations>

const TranslationsContext = createContext<TranslationsContextValue | null>(null)

export function TranslationsProvider({ children }: { children: ReactNode }) {
  const value = useTranslations()
  // createElement avoids adding JSX to a .ts file — the hook file stays JSX-free
  return createElement(TranslationsContext.Provider, { value }, children)
}

export function useTranslationsContext(): TranslationsContextValue {
  const ctx = useContext(TranslationsContext)
  if (!ctx) throw new Error('useTranslationsContext must be used inside <TranslationsProvider>')
  return ctx
}
