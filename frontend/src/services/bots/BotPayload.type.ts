import type { Bot } from './Bot.type'

/** Fields required to create or update a bot, excluding server-generated metadata. */
export type BotPayload = Omit<Bot, 'id' | 'created_by' | 'created_at'>
