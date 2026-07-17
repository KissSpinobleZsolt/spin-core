import type { Message } from '@hooks'
import { STORAGE_KEY } from './STORAGE_KEYS.constant'

/** Read the persisted chat history from localStorage; returns empty array on parse failure. */
export function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Message[]
  } catch {}
  return []
}
