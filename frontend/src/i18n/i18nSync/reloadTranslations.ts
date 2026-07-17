import i18n from '../index'
import { i18nService } from '@services'

// Only fetches and adds bundle — does NOT call changeLanguage (that fires languageChanged → loop)
export async function reloadTranslations(lang: string): Promise<void> {
  const data = await i18nService.getTranslations(lang) // Fetch latest bundle from backend
  i18n.addResourceBundle(lang, 'translation', data, true, true) // Merge without replacing existing keys
}
