import { apiService } from './apiService'

export interface BotEntity {
  id: string
  team_id: string
  team_name: string
  symbol: string
  entity_type: string
  display_name: string
  exchange: string
  active: boolean
}

export interface BotTeam {
  id: string
  name: string
  description: string
  role: string | null
}

export interface BotConfig {
  config: Record<string, unknown>
  teams: BotTeam[]
}

export interface BotProcesses {
  roles: string[]
  signals_today: number
  last_signal: { at: string; title: string; severity: string } | null
  pending_alerts: number
  active_entities: number
  scheduler: Record<string, { next_run: string | null; trigger: string }>
}

export interface EntityAddPayload {
  team_id: string
  symbol: string
  display_name?: string
  exchange?: string
}

export interface EntityPatchPayload {
  display_name?: string
  exchange?: string
  active?: boolean
}

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
