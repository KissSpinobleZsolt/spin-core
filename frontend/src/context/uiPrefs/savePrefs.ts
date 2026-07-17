import type { UIPrefs } from './UIPrefs.type'
import { STORAGE_KEY } from './STORAGE_KEY.constant'

/** Persist UIPrefs to localStorage. */
export function savePrefs(prefs: UIPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}
