import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { botsService, type Bot } from '../services/botsService'
import { useGet } from '../hooks/useApi'
import { useChatStream } from '../hooks/useChatStream'
import { Btn } from '../components/ui/Button'
import { BOT_TYPES, TYPE_BADGE } from '../constants/botConstants'
import { useSettings } from '../context/SettingsContext'
import BotConfigPage from './BotConfigPage'

// ---------------------------------------------------------------------------
// Skeleton config view for non-communicator bots
// ---------------------------------------------------------------------------

function SkeletonRow({ labelW = 'w-1/4', valueW = 'flex-1' }: { labelW?: string; valueW?: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="w-4 h-4 rounded bg-slate-300 dark:bg-slate-600 shrink-0" />
      <div className={`h-2.5 rounded bg-slate-300 dark:bg-slate-600 ${labelW}`} />
      <div className={`h-2.5 rounded bg-slate-200 dark:bg-slate-700 ${valueW}`} />
    </div>
  )
}

function SkeletonSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

function BotConfigSkeleton({ bot }: { bot: Bot }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
        <button
          type="button"
          onClick={() => navigate('/bots')}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1"
          title="Back to bots"
        >
          ←
        </button>
        <span className="text-2xl">{bot.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white text-sm">{bot.name}</p>
          {bot.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{bot.description}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_BADGE[bot.type] ?? TYPE_BADGE.custom}`}>
          {BOT_TYPES.find(t => t.value === bot.type)?.label ?? bot.type}
        </span>
      </div>

      <div className="relative flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900 group rounded-b-xl">
        <SkeletonSection title="Principals">
          <SkeletonRow labelW="w-1/4" valueW="w-2/5" />
          <SkeletonRow labelW="w-1/3" valueW="flex-1" />
          <SkeletonRow labelW="w-1/5" valueW="w-1/2" />
        </SkeletonSection>

        <SkeletonSection title="Configurations">
          <SkeletonRow labelW="w-2/5" valueW="flex-1" />
          <SkeletonRow labelW="w-1/4" valueW="w-3/5" />
          <SkeletonRow labelW="w-1/3" valueW="flex-1" />
        </SkeletonSection>

        <SkeletonSection title="Processes">
          <SkeletonRow labelW="w-1/4" valueW="w-2/5" />
          <SkeletonRow labelW="w-2/5" valueW="flex-1" />
        </SkeletonSection>

        <SkeletonSection title="Scheduler">
          <SkeletonRow labelW="w-1/3" valueW="w-1/4" />
          <SkeletonRow labelW="w-1/4" valueW="w-2/5" />
        </SkeletonSection>

        <div className="absolute inset-0 rounded-b-xl bg-slate-900/50 dark:bg-slate-900/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="text-white font-semibold text-lg px-6 py-3 rounded-xl bg-slate-700/80">Coming soon</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat view for communicator bots
// ---------------------------------------------------------------------------

export default function Chat() {
  const { botId } = useParams<{ botId: string }>()
  const navigate = useNavigate()
  const { modules } = useSettings()

  const { data: bot, isError: botError } = useGet<Bot>(
    ['bot', botId ?? ''],
    () => botsService.getBot(botId!),
    { enabled: !!botId },
  )

  const { messages, setMessages, input, setInput, loading, sendMessage, stopStream } = useChatStream(botId, '')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function clearChat() {
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
