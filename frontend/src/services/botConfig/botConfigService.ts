import { apiService } from '../api'
import type { BotConfig } from './BotConfig.type'
import type { BotEntity } from './BotEntity.type'
import type { BotProcesses } from './BotProcesses.type'
import type { EntityAddPayload } from './EntityAddPayload.type'
import type { EntityPatchPayload } from './EntityPatchPayload.type'
import { urlBuilder } from './urlBuilder'

/** API calls to the bots-trader-platform plugin backend via the core proxy. */
export const botConfigService = {
  getConfig(scope: string, botUuid: string): Promise<BotConfig> {
    return apiService.get(`${urlBuilder({ scope, botUuid })}/config`) // GET bot config
  },

  updateConfig(scope: string, botUuid: string, config: Record<string, unknown>): Promise<{ config: Record<string, unknown> }> {
    return apiService.put(`${urlBuilder({ scope, botUuid })}/config`, { config }) // PUT full config replacement
  },

  getEntities(scope: string, botUuid: string): Promise<BotEntity[]> {
    return apiService.get(`${urlBuilder({ scope, botUuid })}/entities`) // GET all entities for bot
  },

  addEntity(scope: string, botUuid: string, payload: EntityAddPayload): Promise<BotEntity> {
    return apiService.post(`${urlBuilder({ scope, botUuid })}/entities`, payload) // POST new entity under bot
  },

  // patch and delete are entity-scoped, not bot-scoped — entity IDs are globally unique in the module backend
  patchEntity(scope: string, entityId: string, patch: EntityPatchPayload): Promise<BotEntity> {
    return apiService.patch(urlBuilder({ scope, entityId }), patch) // PATCH entity by its own ID
  },

  deleteEntity(scope: string, entityId: string): Promise<void> {
    return apiService.delete(urlBuilder({ scope, entityId })) // DELETE entity by its own ID
  },

  getProcesses(scope: string, botUuid: string): Promise<BotProcesses> {
    return apiService.get(`${urlBuilder({ scope, botUuid })}/processes`) // GET running processes for bot
  },
}
