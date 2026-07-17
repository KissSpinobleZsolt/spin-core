import { useEffect, useRef } from 'react' // scroll-to-bottom + ref
import { useNavigate, useParams } from 'react-router-dom' // route params + navigation
import { botsService, type Bot } from '@services' // bot CRUD
import { useGet, useChatStream } from '@hooks' // data fetching + streaming chat
import { Btn } from '../../components/ui/button' // send / stop button
import { useSettings } from '@context' // module list for resolving scope
import BotConfigPage from '../botConfigPage' // config panel for non-communicator bots
import { BotConfigSkeleton } from './BotConfigSkeleton' // placeholder when scope not yet resolved

export default function Chat() { // chat page — routes to BotConfigPage for non-communicator bots
  const { botId } = useParams<{ botId: string }>()
  const navigate = useNavigate()
  const { modules } = useSettings() // used to resolve bot module UUID → scope string

  const { data: bot, isError: botError } = useGet<Bot>(
    ['bot', botId ?? ''],
    () => botsService.getBot(botId!),
    { enabled: !!botId },
  )

  const { messages, setMessages, input, setInput, loading, sendMessage, stopStream } = useChatStream(botId, '')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { // auto-scroll to latest message
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) { // send on Enter, allow Shift+Enter for newlines
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function clearChat() { // wipe message history without navigating away
    setMessages([])
  }

  if (botError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 dark:text-slate-400">
        <p className="text-lg">Bot not found or unavailable.</p>
        <Btn onClick={() => navigate('/bots')} className="px-4 py-2">Back to Bots</Btn>
      </div>
    )
  }

  if (bot && bot.type !== 'communicator') {
    // Resolve UUID → scope via SettingsContext; the module list is already loaded for the sidebar.
    const moduleScope = modules.find((m) => bot.modules.includes(m.id))?.scope
    if (moduleScope) {
      return <BotConfigPage bot={bot} scope={moduleScope} />
    }
    // Skeleton covers two cases: modules context still loading, or the module was deregistered after this bot was created.
    return <BotConfigSkeleton bot={bot} />
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/bots')}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1"
            title="Back to bots"
          >
            ←
          </button>
          <span className="text-2xl">{bot?.icon ?? '🤖'}</span>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white text-sm">{bot?.name ?? 'Loading…'}</p>
            {bot?.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{bot.description}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 dark:bg-slate-900">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
              }`}
            >
              {msg.content || (loading && i === messages.length - 1 ? <span className="animate-pulse">▌</span> : null)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-xl flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${bot?.name ?? ''}…`}
          rows={1}
          className="flex-1 resize-none rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-32"
        />
        {loading ? (
          <button
            onClick={stopStream}
            title="Stop generation"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shrink-0"
          >
            ■
          </button>
        ) : (
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors shrink-0"
          >
            ↑
          </button>
        )}
      </div>
    </div>
  )
}
