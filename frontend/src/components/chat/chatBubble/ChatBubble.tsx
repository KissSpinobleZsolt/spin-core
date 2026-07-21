import { useEffect, useRef, useState } from 'react'
import { useModelStatusContext } from '@context'
import { botsService, type Bot, apiService, type InstalledModelsData } from '@services'
import { useChatStream } from '@hooks'
import { STORAGE_BOT_KEY, STORAGE_MODEL_KEY } from './STORAGE_KEYS.constant'
import { loadHistory } from './loadHistory'
import { saveHistory } from './saveHistory'
import { Select } from '@components/ui/Select'

export function ChatBubble() {
  const { status } = useModelStatusContext()
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>(() => localStorage.getItem(STORAGE_BOT_KEY) ?? '')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem(STORAGE_MODEL_KEY) ?? '')

  const { messages, setMessages, input, setInput, loading, sendMessage, stopStream } = useChatStream(
    selectedBotId || undefined,
    selectedModel,
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  const selectedBot = bots.find(b => b.id === selectedBotId) ?? null

  // Load bots and models when bubble opens
  useEffect(() => {
    if (!open) return
    botsService.getBots()
      .then(allBots => {
        const list = allBots.filter(b => b.modules.includes('system')) // Only bots scoped to the system module
        setBots(list)
        const savedId = localStorage.getItem(STORAGE_BOT_KEY) ?? ''
        if (savedId && !list.find(b => b.id === savedId)) {
          const first = list[0]
          if (first) {
            setSelectedBotId(first.id)
            localStorage.setItem(STORAGE_BOT_KEY, first.id)
          } else {
            setSelectedBotId('')
            localStorage.removeItem(STORAGE_BOT_KEY)
          }
        } else if (!savedId && list.length > 0) {
          setSelectedBotId(list[0].id)
          localStorage.setItem(STORAGE_BOT_KEY, list[0].id)
        }
      })
      .catch(() => {})

    apiService.get<InstalledModelsData>('/model-status/installed')
      .then(data => {
        if (data.ollama === 'ok') setInstalledModels(data.models.map(m => m.name))
      })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    setMessages(loadHistory()) // Restore persisted history on mount
  }, [])

  useEffect(() => {
    setMessages([]) // Clear history when bot changes
  }, [selectedBot?.id])

  useEffect(() => {
    saveHistory(messages) // Persist after every message change
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Hide the bubble only when Ollama is not ready AND there are no cloud-provider
  // bots available.  Cloud bots (anthropic / openai) never depend on the Ollama
  // readiness status, so we check the selected bot's provider before gating.
  const selectedBotIsCloudProvider =
    selectedBot !== null && selectedBot.provider !== 'ollama' && selectedBot.provider !== undefined

  const ollamaNotReady = !status?.all_ready

  if (ollamaNotReady && !selectedBotIsCloudProvider && bots.length === 0) return null
  if (ollamaNotReady && !selectedBotIsCloudProvider && bots.every(b => b.provider === 'ollama')) return null

  function selectBot(botId: string) {
    setSelectedBotId(botId)
    if (botId) {
      localStorage.setItem(STORAGE_BOT_KEY, botId)
    } else {
      localStorage.removeItem(STORAGE_BOT_KEY)
    }
    setMessages([])
  }

  function selectModel(model: string) {
    setSelectedModel(model)
    if (model) {
      localStorage.setItem(STORAGE_MODEL_KEY, model)
    } else {
      localStorage.removeItem(STORAGE_MODEL_KEY)
    }
  }

  function clearHistory() {
    setMessages([])
    saveHistory([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      {open && (
        <div className="w-[380px] flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden" style={{ height: showSettings ? 560 : 480 }}>
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedBot?.icon ?? '💬'}</span>
              <span className="font-semibold text-sm">{selectedBot?.name ?? 'AI Assistant'}</span>
              {!selectedBotId && selectedModel && (
                <span className="text-xs bg-blue-500/60 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">{selectedModel}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(s => !s)}
                title="Configure bot & model"
                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${showSettings ? 'bg-blue-500 text-white' : 'text-blue-200 hover:text-white'}`}
              >
                ⚙
              </button>
              <button
                onClick={clearHistory}
                title="Clear history"
                className="text-xs text-blue-200 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white transition-colors text-lg leading-none">
                ✕
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-2 shrink-0">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Bot</label>
                <Select
                  value={selectedBotId}
                  onChange={selectBot}
                  className="w-full px-2 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— No bot (free mode) —</option>
                  {bots.map(b => (
                    <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                  ))}
                </Select>
              </div>
              {!selectedBotId && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Model override</label>
                  <input
                    list="bubble-ollama-models"
                    value={selectedModel}
                    onChange={e => selectModel(e.target.value)}
                    placeholder="Default model"
                    className="w-full px-2 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <datalist id="bubble-ollama-models">
                    {installedModels.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              )}
              {selectedBot && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{selectedBot.description}</p>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {msg.content || (loading && i === messages.length - 1 ? <span className="animate-pulse">▌</span> : null)}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-end shrink-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              className="flex-1 resize-none rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-24"
            />
            {loading ? (
              <button
                onClick={stopStream}
                title="Stop generation"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shrink-0"
              >
                ■
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors shrink-0"
              >
                ↑
              </button>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-2xl shadow-lg flex items-center justify-center transition-all"
        title={open ? 'Close chat' : 'Open chat'}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  )
}
