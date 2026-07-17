import { apiService } from '../api'
import type { TranslationData } from './types'

/** Load and persist translations for a given language code. */
export const i18nService = {
  getTranslations(lang: string) {
    return apiService.get<TranslationData>(`/i18n/${lang}`)
  },
  saveTranslations(lang: string, data: TranslationData) {
    return apiService.put<{ ok: boolean }>(`/i18n/${lang}`, data)
  },
}
