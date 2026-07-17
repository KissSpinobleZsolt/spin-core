import { safeJsonParse } from '@utils'
import type { UIPrefs } from './UIPrefs.type'
import { STORAGE_KEY } from './STORAGE_KEY.constant'

const DEFAULT: UIPrefs = { sidebarCollapsed: false }

/** Read and merge UIPrefs from localStorage, falling back to defaults for missing keys. */
export function loadPrefs(): UIPrefs {
  return { ...DEFAULT, ...safeJsonParse<Partial<UIPrefs>>(localStorage.getItem(STORAGE_KEY), {}) }
}
