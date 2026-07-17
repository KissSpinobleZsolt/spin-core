import { useState, useMemo } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { i18nService } from '@services'
import { reloadTranslations } from '../../i18n/i18nSync'
import { flatten, unflatten } from '@utils'
import type { Lang } from './Lang.type'

type SaveState = 'idle' | 'saving' | 'saved'

/** Shape of the value exposed through TranslationsContext. */
export type TranslationsContextValue = ReturnType<typeof useTranslations>

/** Internal hook that manages translation editor state for all supported languages. */
export function useTranslations() {
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
    return Array.from(keys).sort() // Merge keys from both languages and sort alphabetically
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
      await reloadTranslations(lang) // Refresh the i18n bundle so the UI reflects saved changes
      setOriginal(prev => ({ ...prev, [lang]: { ...data[lang] } }))
      setSaveState(prev => ({ ...prev, [lang]: 'saved' }))
      setTimeout(() => setSaveState(prev => ({ ...prev, [lang]: 'idle' })), 2000)
    } catch (e) {
      setError(String(e))
      setSaveState(prev => ({ ...prev, [lang]: 'idle' }))
    }
  }

  function isDirty(lang: Lang) {
    return JSON.stringify(data[lang]) !== JSON.stringify(original[lang]) // Shallow stringify comparison — safe since values are flat strings
  }

  return { data, error, search, setSearch, saveState, filteredKeys, handleChange, handleSave, isDirty }
}

