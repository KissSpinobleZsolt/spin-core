import { useEffect, useRef, useState } from 'react'
import { botsService, type Bot } from '@services'
import { useChatStream } from '@hooks'

interface Props {
  moduleId: string
}

export function ModuleBotPanel({ moduleId }: Props) {
  const [bots, setBots] = useState<Bot[] | null>(null) // null = loading, [] = none available
  const [open, setOpen] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const { messages, setMessages, input, setInput, loading, sendMessage, stopStream } = useChatStream(
    selectedBotId || undefined,
    '',
    moduleId,
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    botsService.getBotsForModule(moduleId)
      .then(list => {
        const communicators = list.filter(b => b.type === 'communicator') // Only show chat-capable bots
        setBots(communicators)
        if (communicators.length > 0) setSelectedBotId(communicators[0].id) // Auto-select first communicator
      })
      .catch(() => setBots([]))
  }, [moduleId])

  useEffect(() => {
    setMessages([]) // Clear history when switching bots
  }, [selectedBotId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  if (bots === null) return null // Still loading
  if (bots.length === 0) return null // No bots for this module — don't show the panel

  const selectedBot = bots.find(b => b.id === selectedBotId) ?? bots[0]

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="fixed bottom-6 left-6 z-[9998] flex flex-col items-start gap-2">
      {open && (
        <div className="w-[360px] flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden" style={{ height: 460 }}>
          <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedBot.icon}</span>
              <span className="font-semibold text-sm">{selectedBot.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([])}
                title="Clear history"
                className="text-xs text-violet-200 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button onClick={() => setOpen(false)} className="text-violet-200 hover:text-white transition-colors text-lg leading-none">
                ✕
              </button>
            </div>
          </div>

          {bots.length > 1 && (
            <div className="flex gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0 overflow-x-auto">
              {bots.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBotId(b.id)}
                  title={b.description}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    b.id === selectedBotId
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-violet-100 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{b.icon}</span>
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">{selectedBot.description}</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
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
              className="flex-1 resize-none rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 max-h-24"
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
                className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition-colors shrink-0"
              >
                ↑
              </button>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-2xl shadow-lg flex items-center justify-center transition-all"
        title={open ? 'Close module assistant' : 'Open module assistant'}
      >
        {open ? '✕' : (bots.length === 1 ? selectedBot.icon : '🤖')}
        {!open && bots.length > 1 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 text-violet-600 text-[10px] font-bold flex items-center justify-center border border-violet-200 dark:border-slate-700">
            {bots.length}
          </span>
        )}
      </button>
    </div>
  )
}
