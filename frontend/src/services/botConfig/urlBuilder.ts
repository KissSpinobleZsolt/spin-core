import { BASE_PATH } from './botConfig.constant'
import type { BotUrlParams } from './BotUrlParams.type'

// Routes to entity-scoped path when entityId is present, bot-scoped otherwise.
export const urlBuilder = ({ scope, botUuid, entityId }: BotUrlParams): string =>
  entityId
    ? `/${BASE_PATH}/${scope}/entities/${entityId}`
    : `/${BASE_PATH}/${scope}/bots/${botUuid}`
