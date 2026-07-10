import { apiService } from './apiService'

export type TranslationData = Record<string, unknown>

export const i18nService = {
  getTranslations(lang: string) {
    return apiService.get<TranslationData>(`/i18n/${lang}`)
  },
  saveTranslations(lang: string, data: TranslationData) {
    return apiService.put<{ ok: boolean }>(`/i18n/${lang}`, data)
  },
}
