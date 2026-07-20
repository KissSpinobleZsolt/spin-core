import { useState } from 'react' // modal open + error state
import { useSearchParams } from 'react-router-dom' // modal routing via ?new / ?edit / ?logs
import {
  botsService, type Bot, type BotPayload, type BotType,
  settingsService, type ModuleConfig,
} from '@services' // CRUD services
import { useGet } from '@hooks' // data fetching
import { Btn } from '@components/ui/button' // action buttons
import { Badge } from '@components/ui/badge' // type badge in table
import { Toggle } from '@components/ui/toggle' // active toggle in table
import { Spinner } from '@components/ui/spinner' // loading indicator
import { ErrorBanner } from '@components/ui/ErrorBanner' // error message
import { PageTitle } from '@components/ui/PageTitle' // page heading
import { Table, type TableColumn } from '@components/ui/Table' // data table
import { BOT_TYPES } from '@constants/botConstants' // type label map
import { BotModal } from './BotModal' // add/edit form modal
import { BotLogsDrawer } from './BotLogsDrawer' // logs slide-in drawer

export default function BotsAdmin() { // admin page for managing all bots
  const [searchParams, setSearchParams] = useSearchParams() // ?new / ?edit=id / ?logs=id
  const [error, setError] = useState<string | null>(null)

  const { data: bots = [], isLoading, isError, refetch } = useGet<Bot[]>(
    ['bots-admin'],
    () => botsService.getBots(),
  )

  const { data: botTypes = [] } = useGet<BotType[]>(
    ['bot-types'],
    () => botsService.getBotTypes(),
  )

  const { data: allModules = [] } = useGet<ModuleConfig[]>(
    ['modules-list'],
    () => settingsService.getModules(),
  )
  const installedModules = allModules.filter(m => m.enabled) // only enabled modules shown in picker

  const isAdding = searchParams.has('new') // true when ?new param present
  const editBotId = searchParams.get('edit') // bot id to edit, or null
  const logsBotId = searchParams.get('logs') // bot id for logs drawer, or null
  const editBot = bots.find(b => b.id === editBotId)
  const logsBot = bots.find(b => b.id === logsBotId)

  function closeModal() { // remove ?new / ?edit from URL
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    next.delete('edit')
    setSearchParams(next, { replace: true })
  }

  function closeLogs() { // remove ?logs from URL
    const next = new URLSearchParams(searchParams)
    next.delete('logs')
    setSearchParams(next, { replace: true })
  }

  async function handleSave(payload: BotPayload) { // create or update depending on modal mode
    if (isAdding) {
      await botsService.createBot(payload)
    } else if (editBot) {
      await botsService.updateBot(editBot.id, payload)
    }
    await refetch()
    closeModal()
  }

  async function handleDelete(bot: Bot) { // confirm then delete and refresh
    if (!confirm(`Delete "${bot.name}"?`)) return
    try {
      await botsService.deleteBot(bot.id)
      await refetch()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle(bot: Bot) { // flip active flag and save immediately
    try {
      // Spread the full bot into BotPayload; created_by and created_at are server-only.
      const { id, created_by, created_at, ...payload } = bot
      await botsService.updateBot(id, { ...payload, active: !bot.active })
      await refetch()
    } catch (err) {
      setError(String(err))
    }
  }

  const columns: TableColumn<Bot>[] = [
    {
      key: 'bot',
      header: 'Bot',
      cell: bot => (
        <>
          <span className="mr-2">{bot.icon}</span>
          <span className="font-medium text-slate-800 dark:text-white">{bot.name}</span>
          {bot.description && (
            <span className="ml-2 text-slate-400 dark:text-slate-500 text-xs truncate max-w-[160px] inline-block align-middle">
              {bot.description}
            </span>
          )}
        </>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: bot => (
        <Badge variant={bot.type === 'communicator' ? 'info' : 'neutral'}>
          {BOT_TYPES.find(t => t.value === bot.type)?.label ?? bot.type}
        </Badge>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      className: 'text-xs',
      cell: bot => (
        <Badge variant={bot.provider === 'anthropic' ? 'warn' : bot.provider === 'openai' ? 'success' : 'neutral'}>
          {bot.provider ?? 'ollama'}
        </Badge>
      ),
    },
    {
      key: 'model',
      header: 'Model',
      className: 'font-mono text-slate-500 dark:text-slate-400 text-xs',
      cell: bot => bot.model || <span className="italic">default</span>,
    },
    {
      key: 'created_by',
      header: 'Created by',
      className: 'text-slate-500 dark:text-slate-400 text-xs',
      cell: bot => (
        <span className="truncate max-w-[140px] block">
          {bot.created_by || <span className="italic">system</span>}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Active',
      headerClassName: 'w-px',
      className: 'w-px',
      cell: bot => (
        <Toggle checked={bot.active} onChange={() => handleToggle(bot)} disabled={bot.modules.length === 0} />
      ),
    },
    {
      key: 'actions',
      headerClassName: 'w-px',
      className: 'w-px whitespace-nowrap',
      cell: bot => (
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setSearchParams({ logs: bot.id })}>Logs</Btn>
          <Btn variant="secondary" onClick={() => setSearchParams({ edit: bot.id })}>Edit</Btn>
          <Btn variant="danger" onClick={() => handleDelete(bot)}>Delete</Btn>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageTitle>Bots</PageTitle>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message="Failed to load bots." />}
      {error && <ErrorBanner message={error} />}

      {!isLoading && !isError && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <Table
            columns={columns}
            rows={bots}
            rowKey={bot => bot.id}
            empty={<p className="text-sm text-slate-500 dark:text-slate-400">No bots configured yet.</p>}
          />
          <Btn onClick={() => setSearchParams({ new: '1' })}>+ Add bot</Btn>
        </div>
      )}

      {(isAdding || editBot) && (
        <BotModal
          initial={editBot}
          botTypes={botTypes}
          installedModules={installedModules}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {logsBot && <BotLogsDrawer bot={logsBot} onClose={closeLogs} />}
    </div>
  )
}
