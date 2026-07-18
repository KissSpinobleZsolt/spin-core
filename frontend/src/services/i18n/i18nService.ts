import { apiService } from '../api'
import type { TranslationData } from './TranslationData.type'

const BASE_PATH = 'i18n' // root segment for all translation endpoints

/** Load and persist translations for a given language code. */
export const i18nService = {
  getTranslations(lang: string) {
    return apiService.get<TranslationData>(`/${BASE_PATH}/${lang}`)
  },
  saveTranslations(lang: string, data: TranslationData) {
    return apiService.put<{ ok: boolean }>(`/${BASE_PATH}/${lang}`, data)
  },
}
