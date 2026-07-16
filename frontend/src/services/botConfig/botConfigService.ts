import { apiService } from '../apiService'
import type { BotConfig, BotEntity, BotProcesses, EntityAddPayload, EntityPatchPayload } from './types'

/** API calls to the bots-trader-platform plugin backend via the core proxy. */
export const botConfigService = {
  getConfig(scope: string, botUuid: string): Promise<BotConfig> {
    return apiService.get(`/plugin/${scope}/bots/${botUuid}/config`)
  },

  updateConfig(scope: string, botUuid: string, config: Record<string, unknown>): Promise<{ config: Record<string, unknown> }> {
    return apiService.put(`/plugin/${scope}/bots/${botUuid}/config`, { config })
  },

  getEntities(scope: string, botUuid: string): Promise<BotEntity[]> {
    return apiService.get(`/plugin/${scope}/bots/${botUuid}/entities`)
  },

  addEntity(scope: string, botUuid: string, payload: EntityAddPayload): Promise<BotEntity> {
    return apiService.post(`/plugin/${scope}/bots/${botUuid}/entities`, payload)
  },

  // patch and delete are entity-scoped, not bot-scoped — entity IDs are globally unique in the module backend
  patchEntity(scope: string, entityId: string, patch: EntityPatchPayload): Promise<BotEntity> {
    return apiService.patch(`/plugin/${scope}/entities/${entityId}`, patch)
  },

  deleteEntity(scope: string, entityId: string): Promise<void> {
    return apiService.delete(`/plugin/${scope}/entities/${entityId}`)
  },

  getProcesses(scope: string, botUuid: string): Promise<BotProcesses> {
    return apiService.get(`/plugin/${scope}/bots/${botUuid}/processes`)
  },
}
