import { useEffect } from 'react'
import i18n from './index'
import { i18nService } from '../services/i18nService'

export async function reloadTranslations(lang: string): Promise<void> {
  try {
    const data = await i18nService.getTranslations(lang)
    i18n.addResourceBundle(lang, 'translation', data, true, true)
  } catch {
    // silently fall back to bundled static translations
  }
}

export function useI18nSync(): void {
  useEffect(() => {
    reloadTranslations(i18n.language)

    function onLangChange(lang: string) {
      reloadTranslations(lang)
    }
    i18n.on('languageChanged', onLangChange)
    return () => {
      i18n.off('languageChanged', onLangChange)
    }
  }, [])
}
