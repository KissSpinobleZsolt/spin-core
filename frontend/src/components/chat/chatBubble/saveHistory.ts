import type { Message } from '@hooks'
import { STORAGE_KEY } from './STORAGE_KEYS.constant'

/** Persist the current chat history to localStorage; silently swallows quota errors. */
export function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {}
}
