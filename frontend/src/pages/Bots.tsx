import { useNavigate } from 'react-router-dom'
import { botsService, type Bot } from '../services/botsService'
import { useGet } from '../hooks/useApi'

const BOT_TYPES = [
  { value: 'chatbot',  label: 'Chatbot' },
  { value: 'watchbot', label: 'Watch Bot' },
  { value: 'tradebot', label: 'Trade Bot' },
  { value: 'custom',   label: 'Custom' },
]

const TYPE_BADGE: Record<string, string> = {
  chatbot:  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  watchbot: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  tradebot: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  custom:   'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
}

function BotCard({ bot }: { bot: Bot }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none shrink-0">{bot.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white truncate">{bot.name}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[bot.type] ?? TYPE_BADGE.custom}`}>
            {BOT_TYPES.find(t => t.value === bot.type)?.label ?? bot.type}
          </span>
        </div>
      </div>
      {bot.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{bot.description}</p>
      )}
      <button
        type="button"
        onClick={() => navigate(`/bots/${bot.id}`)}
        className="mt-auto w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
      >
        Launch
      </button>
    </div>
  )
}

export default function Bots() {
  const { data: bots = [], isLoading, isError } = useGet<Bot[]>(
    ['bots'],
    () => botsService.getBots(),
  )

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Bots</h1>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {isError && <p className="text-sm text-red-500">Failed to load bots.</p>}

      {!isLoading && !isError && bots.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No bots available to you right now.</p>
      )}

      {!isLoading && !isError && bots.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map(bot => <BotCard key={bot.id} bot={bot} />)}
        </div>
      )}
    </div>
  )
}
