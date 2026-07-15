import { useEffect, useRef, useState } from 'react'
import { useModelStatusContext } from '../../context/ModelStatusContext'
import { botsService, type Bot } from '../../services/botsService'
import { apiService } from '../../services/apiService'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'spin_core_chat_history'
const STORAGE_BOT_KEY = 'spin_core_selected_bot'
const STORAGE_MODEL_KEY = 'spin_core_selected_model'

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Message[]
  } catch {}
  return []
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {}
}


type InstalledModelsData = {
  ollama: 'ok' | 'unreachable'
  models: { name: string }[]
}

export function ChatBubble() {
  const { status } = useModelStatusContext()
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>(() => localStorage.getItem(STORAGE_BOT_KEY) ?? '')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem(STORAGE_MODEL_KEY) ?? '')

  const [messages, setMessages] = useState<Message[]>(loadHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const selectedBot = bots.find(b => b.id === selectedBotId) ?? null

  // Load bots and models when bubble opens
  useEffect(() => {
    if (!open) return
    botsService.getBots()
      .then(list => {
        setBots(list)
        const savedId = localStorage.getItem(STORAGE_BOT_KEY) ?? ''
        if (savedId && !list.find(b => b.id === savedId)) {
          // Saved bot no longer available — fall back to first
          const first = list[0]
          if (first) {
            setSelectedBotId(first.id)
            localStorage.setItem(STORAGE_BOT_KEY, first.id)
          } else {
            setSelectedBotId('')
            localStorage.removeItem(STORAGE_BOT_KEY)
          }
        } else if (!savedId && list.length > 0) {
          // No preference saved — auto-select first bot
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

  // Clear history when bot changes
  useEffect(() => {
    setMessages([])
  }, [selectedBot?.id])

  useEffect(() => {
    saveHistory(messages)
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  if (!status?.all_ready) return null

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

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    const token = localStorage.getItem('token') ?? ''
    const body: Record<string, unknown> = {
      messages: history,
    }
    if (selectedBotId) {
      body.bot_id = selectedBotId
    } else if (selectedModel) {
      body.model = selectedModel
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line)
            if (chunk.error) {
              setMessages(prev => {
                const c = [...prev]
                c[c.length - 1] = { role: 'assistant', content: `Error: ${chunk.error}` }
                return c
              })
              return
            }
            if (chunk.message?.content) {
              setMessages(prev => {
                const c = [...prev]
                c[c.length - 1] = { role: 'assistant', content: c[c.length - 1].content + chunk.message.content }
                return c
              })
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const c = [...prev]
        c[c.length - 1] = { role: 'assistant', content: 'Could not reach the chat service.' }
        return c
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      {open && (
        <div className="w-[380px] flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden" style={{ height: showSettings ? 560 : 480 }}>
          {/* Header */}
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

          {/* Settings panel */}
          {showSettings && (
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-2 shrink-0">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Bot</label>
                <select
                  value={selectedBotId}
                  onChange={e => selectBot(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— No bot (free mode) —</option>
                  {bots.map(b => (
                    <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                  ))}
                </select>
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

          {/* Messages */}
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

          {/* Input */}
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-end shrink-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              className="flex-1 resize-none rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-24"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors shrink-0"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Bubble toggle */}
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
