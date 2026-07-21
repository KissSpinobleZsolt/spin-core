import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ModelStatusPayload } from '@hooks'

const SSE_URL = `${(import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')}/model-status/stream`

interface ModelStatusState {
  status: ModelStatusPayload | null
  dismissed: boolean
  _cleanup: (() => void) | null
  _everNotReady: boolean
  dismiss: () => void
  connect: () => void
  disconnect: () => void
}

export const useModelStatusStore = create<ModelStatusState>()(devtools((set, get) => ({
  status: null,
  dismissed: false,
  _cleanup: null,
  _everNotReady: false,

  dismiss() {
    set({ dismissed: true }, false, 'modelStatus/dismiss')
  },

  connect() {
    get()._cleanup?.()  // close any existing SSE before opening a new one

    const es = new EventSource(SSE_URL)

    es.onmessage = (e: MessageEvent) => {
      const data: ModelStatusPayload = JSON.parse(e.data as string)

      if (!data.all_ready) set({ _everNotReady: true }, false, 'modelStatus/notReady')

      set({ status: data }, false, 'modelStatus/update')

      if (data.all_ready) {
        es.close()
        set({ _cleanup: null }, false, 'modelStatus/sseClose')
        // Delay auto-dismiss when the user saw a loading state — brief "all ready" confirmation
        const delay = get()._everNotReady ? 4000 : 0
        setTimeout(() => set({ dismissed: true }, false, 'modelStatus/autoDismiss'), delay)
      }
    }

    es.onerror = () => {}  // EventSource reconnects automatically; no manual handling needed

    set({ _cleanup: () => es.close() }, false, 'modelStatus/connect')
  },

  disconnect() {
    get()._cleanup?.()
    set({ status: null, dismissed: false, _cleanup: null, _everNotReady: false }, false, 'modelStatus/disconnect')
  },
}), { name: 'ModelStatusStore' }))
