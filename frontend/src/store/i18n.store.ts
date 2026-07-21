import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface I18nStore {
  ready: boolean  // true once the initial translation bundle has loaded
  setReady: (v: boolean) => void  // called by useI18nSync after the first successful fetch
}

export const useI18nStore = create<I18nStore>()(devtools((set) => ({
  ready: false,  // starts false so Layout blocks render until translations are available
  setReady: (ready) => set({ ready }, false, 'i18n/setReady'),
}), { name: 'I18nStore' }))
