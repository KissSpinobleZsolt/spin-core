import { useNavigate } from 'react-router-dom'
import { botsService, type Bot } from '../services/botsService'
import { useGet } from '../hooks/useApi'
import { Btn } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageTitle } from '../components/ui/PageTitle'
import { BOT_TYPES, TYPE_BADGE } from '../constants/botConstants'

function BotCard({ bot }: { bot: Bot }) {
  const navigate = useNavigate()
  return (
    <Card className="flex flex-col gap-3 hover:shadow-md transition-shadow">
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
      <Btn className="mt-auto w-full py-2" onClick={() => navigate(`/bots/${bot.id}`)}>Launch</Btn>
    </Card>
  )
}

export default function Bots() {
  const { data: bots = [], isLoading, isError } = useGet<Bot[]>(
    ['bots'],
    () => botsService.getBots(),
  )

  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle>Bots</PageTitle>

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
