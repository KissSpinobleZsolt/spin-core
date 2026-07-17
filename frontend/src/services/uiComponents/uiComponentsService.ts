import { apiService } from '../api'
import type { UIComponentDoc } from './types'

export const uiComponentsService = {
  async getAll(): Promise<UIComponentDoc[]> {
    return apiService.get('/ui-components')
  },
}
