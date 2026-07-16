import { useEffect, useRef, useState } from 'react'
import i18n from './index'
import { i18nService } from '@services'
import { useHealth } from '../context/HealthContext'

// Only fetches and adds bundle — does NOT call changeLanguage (that fires languageChanged → loop)
export async function reloadTranslations(lang: string): Promise<void> {
  const data = await i18nService.getTranslations(lang)
  i18n.addResourceBundle(lang, 'translation', data, true, true)
}

export function useI18nSync(): boolean {
  const [ready, setReady] = useState(false)
  const health = useHealth()
  const lastVersionRef = useRef<string | undefined>(undefined)

  // Initial load + language-switch handler
  useEffect(() => {
    reloadTranslations(i18n.language)
      .then(() => setReady(true))
      .catch(() => setReady(true))

    function onLangChange(lang: string) {
      lastVersionRef.current = undefined // re-anchor for new language on next health tick
      reloadTranslations(lang)
    }
    i18n.on('languageChanged', onLangChange)
    return () => {
      i18n.off('languageChanged', onLangChange)
    }
  }, [])

  // Background reload when health detects a version bump for the active language
  useEffect(() => {
    if (!ready) return
    const version = health.translations?.[i18n.language]
    if (!version) return
    if (lastVersionRef.current !== undefined && lastVersionRef.current !== version) {
      reloadTranslations(i18n.language)
    }
    lastVersionRef.current = version
  }, [health.translations, ready])

  return ready
}
