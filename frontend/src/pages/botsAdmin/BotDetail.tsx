import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { botsService, settingsService, type Bot, type BotPayload, type BotType, type ModuleConfig } from '@services'
import { useGet } from '@hooks'
import { Btn } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Toggle } from '@components/ui/toggle'
import { ErrorBanner } from '@components/ui/ErrorBanner'
import { PageTitle } from '@components/ui/PageTitle'
import { Spinner } from '@components/ui/spinner'
import { BotModal } from './BotModal'
import { BotLogsDrawer } from './BotLogsDrawer'

export default function BotDetail() {
  const { id } = useParams<{ id: string }>()           // bot UUID from URL
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: bot, isLoading, isError, refetch } = useGet<Bot>(
    ['bot-detail', id ?? ''],
    () => botsService.getBot(id!),
    { enabled: !!id },
  )

  const { data: botTypes = [] } = useGet<BotType[]>(
    ['bot-types'],
    () => botsService.getBotTypes(),
  )

  const { data: allModules = [] } = useGet<ModuleConfig[]>(
    ['modules-list'],
    () => settingsService.getModules(),
  )
  const installedModules = allModules.filter(m => m.enabled)

  const [editOpen, setEditOpen]   = useState(false)
  const [logsOpen, setLogsOpen]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  if (isLoading) return <Spinner />
  if (isError || !bot) {
    return (
      <div className="space-y-4">
        <Btn variant="secondary" onClick={() => navigate('/admin/bots')}>← Bots</Btn>
        <p className="text-sm text-slate-500 dark:text-slate-400">Bot not found.</p>
      </div>
    )
  }

  const ownerModule = allModules.find(m => bot.modules.includes(m.id))

  async function handleSave(payload: BotPayload) {
    try {
      await botsService.updateBot(bot!.id, payload)
      await refetch()
      setEditOpen(false)
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${bot!.name}"? This cannot be undone.`)) return
    try {
      await botsService.deleteBot(bot!.id)
      await qc.invalidateQueries({ queryKey: ['bots-admin'] })  // flush cache so the list page reflects the deletion immediately
      navigate('/admin/bots')
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle() {
    try {
      const { id: _id, created_by, created_on, owner, updated_by, updated_on, ...payload } = bot!
      await botsService.updateBot(bot!.id, { ...payload, active: !bot!.active })
      await refetch()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Btn variant="secondary" onClick={() => navigate('/admin/bots')}>← Bots</Btn>
        <PageTitle>{bot.icon} {bot.name}</PageTitle>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            {bot.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{bot.description}</p>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm mt-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Type</dt>
              <dd><Badge variant="info">{bot.type}</Badge></dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Provider</dt>
              <dd>
                <Badge variant={bot.provider === 'anthropic' ? 'warn' : bot.provider === 'openai' ? 'success' : 'neutral'}>
                  {bot.provider}
                </Badge>
              </dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Model</dt>
              <dd className="font-mono text-slate-700 dark:text-slate-300 text-xs">
                {bot.model || <span className="italic text-slate-400">default</span>}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Module</dt>
              <dd>
                {ownerModule
                  ? <Badge variant="info">{ownerModule.icon} {ownerModule.name}</Badge>
                  : <span className="italic text-slate-400 text-xs">global</span>}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Restricted</dt>
              <dd><Badge variant="neutral">{bot.restricted}</Badge></dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Active</dt>
              <dd><Toggle checked={bot.active} onChange={handleToggle} disabled={bot.modules.length === 0} /></dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Created by</dt>
              <dd className="text-slate-600 dark:text-slate-400 text-xs">
                {bot.created_by || <span className="italic">system</span>}
              </dd>
            </dl>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            <Btn variant="secondary" onClick={() => navigate(`/bots/${bot.id}`)}>Chat</Btn>
            <Btn variant="secondary" onClick={() => setLogsOpen(true)}>Logs</Btn>
            <Btn onClick={() => setEditOpen(true)}>Edit</Btn>
            <Btn variant="danger" onClick={handleDelete}>Delete</Btn>
          </div>
        </div>

        {bot.system_prompt && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">System prompt</p>
            <pre className="text-xs bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 whitespace-pre-wrap text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto">
              {bot.system_prompt}
            </pre>
          </div>
        )}

        {/* Config schema — shows the configurable fields declared in the manifest and their defaults */}
        {Array.isArray(bot.config_schema?.configurations) && bot.config_schema.configurations.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Default configurations</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 text-xs items-center">
              <span className="font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Field</span>
              <span className="font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Type</span>
              <span className="font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Default</span>
              {(bot.config_schema.configurations as Array<{ key: string; label: string; type: string; default?: unknown }>).map(cfg => (
                <>
                  <span key={`${cfg.key}-label`} className="text-slate-700 dark:text-slate-300">{cfg.label}</span>
                  <span key={`${cfg.key}-type`} className="font-mono text-slate-400 dark:text-slate-500">{cfg.type}</span>
                  <span key={`${cfg.key}-default`} className="font-mono text-slate-600 dark:text-slate-400">
                    {cfg.default !== undefined ? String(cfg.default) : '—'}
                  </span>
                </>
              ))}
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <BotModal
          initial={bot}
          botTypes={botTypes}
          installedModules={installedModules}
          onSave={handleSave}
          onClose={() => setEditOpen(false)}
        />
      )}

      {logsOpen && <BotLogsDrawer bot={bot} onClose={() => setLogsOpen(false)} />}
    </div>
  )
}
