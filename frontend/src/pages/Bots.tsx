import { useNavigate } from 'react-router-dom'
import { botsService, type Bot } from '@services'
import { useGet } from '../hooks/useApi'
import { Btn } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { PageTitle } from '../components/ui/PageTitle'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { BOT_TYPES } from '../constants/botConstants'

function BotHeader({ bot }: { bot: Bot }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none shrink-0">{bot.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white truncate">{bot.name}</p>
          <Badge variant={bot.type === 'communicator' ? 'info' : 'neutral'}>
            {BOT_TYPES.find(t => t.value === bot.type)?.label ?? bot.type}
          </Badge>
        </div>
      </div>
      {bot.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{bot.description}</p>
      )}
    </>
  )
}

function BotCard({ bot }: { bot: Bot }) {
  const navigate = useNavigate()
  const isCommunicator = bot.type === 'communicator'
  return (
    <Card className="flex flex-col gap-3 hover:shadow-md transition-shadow">
      <BotHeader bot={bot} />
      <Btn
        className="mt-auto w-full py-2"
        variant={isCommunicator ? 'primary' : 'secondary'}
        onClick={() => navigate(`/bots/${bot.id}`)}
      >
        {isCommunicator ? 'Launch' : 'Open'}
      </Btn>
    </Card>
  )
}

export default function Bots() {
  const { data: allBots = [], isLoading, isError } = useGet<Bot[]>(
    ['bots'],
    () => botsService.getBots(),
  )
  const bots = allBots.filter(b => !b.modules.includes('core'))

  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle>Bots</PageTitle>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message="Failed to load bots." />}

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
