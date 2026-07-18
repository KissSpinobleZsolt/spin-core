import { apiService } from '../api'
import type { UIComponentDoc } from './UIComponentDoc.type'

const BASE_PATH = 'ui-components' // root segment for UI component documentation endpoints

export const uiComponentsService = {
  async getAll(): Promise<UIComponentDoc[]> {
    return apiService.get(`/${BASE_PATH}`)
  },
}
