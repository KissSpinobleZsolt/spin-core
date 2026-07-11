import { useEffect, useState, type ComponentType } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { loadFederatedModule } from '../../utils/federationLoader'

const FALLBACK_URL = import.meta.env.VITE_CHATBOT_REMOTE_URL ?? 'http://localhost:3002/remoteEntry.js'

export function ChatBubble() {
  const { modules } = useSettings()
  const [Widget, setWidget] = useState<ComponentType | null>(null)

  // Prefer the URL stored in Settings (admin-configurable); fall back to the
  // build-time env var so the bubble still works for non-admin users.
  const chatbotModule = modules.find(m => m.scope === 'chatbot' && m.enabled)
  const remoteUrl = chatbotModule?.remote_url ?? FALLBACK_URL

  useEffect(() => {
    setWidget(null)
    loadFederatedModule(remoteUrl, 'chatbot', './ChatWidget')
      .then(Comp => setWidget(() => Comp))
      .catch(() => { /* silently skip if chatbot remote is not running */ })
  }, [remoteUrl])

  // If the module exists in settings but is disabled, hide the bubble.
  if (chatbotModule === undefined && modules.length > 0) return null
  if (chatbotModule && !chatbotModule.enabled) return null
  if (!Widget) return null
  return <Widget />
}
