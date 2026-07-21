import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  botsService, type Bot, type BotPayload, type BotType,
  settingsService, type ModuleConfig,
} from '@services'
import { useGet } from '@hooks'
import { Btn } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Toggle } from '@components/ui/toggle'
import { Spinner } from '@components/ui/spinner'
import { ErrorBanner } from '@components/ui/ErrorBanner'
import { PageTitle } from '@components/ui/PageTitle'
import { Table, type TableColumn } from '@components/ui/Table'
import { BOT_TYPES } from '@constants/botConstants'
import { BotModal } from './BotModal'  // used only for the "+ Add bot" flow
import { Select } from '@components/ui/Select'

export default function BotsAdmin() {
  const [searchParams, setSearchParams] = useSearchParams()  // ?new param for add modal, ?module for filter
  const [error, setError] = useState<string | null>(null)
  const [moduleFilter, setModuleFilter] = useState<string>(() => searchParams.get('module') ?? '')  // pre-filter from "View bots" link
  const navigate = useNavigate()

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
  const installedModules = allModules.filter(m => m.enabled)  // only enabled modules shown in add-bot picker

  const filteredBots = moduleFilter
    ? bots.filter(b => b.modules.includes(moduleFilter))
    : bots

  const isAdding = searchParams.has('new')  // true when ?new present

  function closeModal() {
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next, { replace: true })
  }

  async function handleCreate(payload: BotPayload) {
    try {
      await botsService.createBot(payload)
      await refetch()
      closeModal()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle(bot: Bot) {  // inline active flip; full edits go to the detail page
    try {
      const { id, created_by, created_on, owner, updated_by, updated_on, ...payload } = bot
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
        </>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      cell: bot => {
        const mod = allModules.find(m => bot.modules.includes(m.id))
        return mod
          ? <Badge variant="info">{mod.icon} {mod.name}</Badge>
          : <span className="text-slate-400 dark:text-slate-500 text-xs italic">global</span>
      },
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
          <Btn variant="secondary" onClick={() => navigate(`/admin/bots/${bot.id}`)}>Edit</Btn>
          <Btn variant="secondary" onClick={() => navigate(`/bots/${bot.id}`)}>Chat</Btn>
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

          {allModules.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-500 dark:text-slate-400 shrink-0">Filter by module</label>
              <Select
                value={moduleFilter}
                onChange={setModuleFilter}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All bots</option>
                {allModules.map(m => (
                  <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
                ))}
              </Select>
              {moduleFilter && (
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  onClick={() => setModuleFilter('')}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          )}

          <Table
            columns={columns}
            rows={filteredBots}
            rowKey={bot => bot.id}
            empty={
              moduleFilter
                ? <p className="text-sm text-slate-500 dark:text-slate-400">No bots for this module yet. Use "Reseed bots" on the Modules page.</p>
                : <p className="text-sm text-slate-500 dark:text-slate-400">No bots configured yet.</p>
            }
          />
          <Btn onClick={() => setSearchParams({ new: '1' })}>+ Add bot</Btn>
        </div>
      )}

      {isAdding && (
        <BotModal
          botTypes={botTypes}
          installedModules={installedModules}
          onSave={handleCreate}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
