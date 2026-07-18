import { botsService, type Bot } from '@services' // bots CRUD service
import { useGet } from '@hooks' // data-fetching hook
import { PageTitle } from '@components/ui/PageTitle' // page heading
import { AdminPageShell } from '@components/layout/adminPageShell' // layout wrapper
import { Spinner } from '@components/ui/spinner' // loading indicator
import { ErrorBanner } from '@components/ui/ErrorBanner' // error message
import { BotCard } from './BotCard' // single bot card

export default function Bots() { // public bot catalogue (hides system bots)
  const { data: allBots = [], isLoading, isError } = useGet<Bot[]>(
    ['bots'],
    () => botsService.getBots(),
  )
  const bots = allBots.filter(b => !b.modules.includes('system')) // system bots are hidden from /bots

  return (
    <AdminPageShell maxWidth="max-w-5xl">
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
    </AdminPageShell>
  )
}
