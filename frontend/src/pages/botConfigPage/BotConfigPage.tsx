import { useState, useEffect } from 'react' // form state and data loading
import { useNavigate } from 'react-router-dom' // back navigation
import { type Bot, type BotConfigSchemaField, botConfigService, type BotTeam, type BotEntity } from '@services' // bot + config types
import { Spinner } from '@components/ui/spinner' // loading indicator
import { Btn } from '@components/ui/button' // save button
import { BOT_TYPES, TYPE_BADGE } from '@constants/botConstants' // type labels + badge classes
import { SectionHeader } from './SectionHeader' // collapsible section toggle
import { ConfigFieldRow } from './ConfigFieldRow' // renders a single schema field
import { WatchlistSection } from './WatchlistSection' // symbol watchlist management
import { RiskProfilesSection } from './RiskProfilesSection' // team risk profile selectors
import { TeamsSection } from './TeamsSection' // read-only team list
import { ProcessesSection } from './ProcessesSection' // scheduler + process metrics

export default function BotConfigPage({ bot, scope }: { bot: Bot; scope: string }) { // config panel for non-communicator bots
  const navigate = useNavigate()
  const botId = bot.id
  const schema = bot.config_schema ?? {} // schema from bot definition

  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [teams, setTeams] = useState<BotTeam[]>([])
  const [entities, setEntities] = useState<BotEntity[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [loadingEntities, setLoadingEntities] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  const [open, setOpen] = useState({
    principals: true,
    configurations: true,
    processes: false, // collapsed by default — ProcessesSection fetches on mount, so this avoids a network call on page load
    scheduler: true,
  })

  const configFields = (schema.configurations ?? []) as BotConfigSchemaField[] // field definitions for the Configurations section
  const schedulerFields = (schema.scheduler ?? []) as BotConfigSchemaField[] // field definitions for the Scheduler section
  const principalsType = schema.principals as string | undefined // 'watchlist' | 'risk_profiles' | 'teams' | undefined
  const showWatchlist = principalsType === 'watchlist' // watchlist section requires special entity management
  const riskLevels = (schema.risk_levels ?? ['Conservative', 'Moderate', 'Aggressive']) as string[]

  useEffect(() => { // load bot config and teams on mount
    setLoadingConfig(true)
    botConfigService.getConfig(scope, botId)
      .then(({ config: c, teams: t }) => { setConfig(c); setTeams(t) })
      .catch(() => {})
      .finally(() => setLoadingConfig(false))
  }, [scope, botId])

  useEffect(() => { // load watchlist entities only when principals type requires it
    if (!showWatchlist) { setLoadingEntities(false); return }
    setLoadingEntities(true)
    botConfigService.getEntities(scope, botId)
      .then(setEntities)
      .catch(() => {})
      .finally(() => setLoadingEntities(false))
  }, [scope, botId, showWatchlist])

  function handleConfigChange(key: string, value: unknown) { // update single config key in local state
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() { // PUT config and show brief success confirmation
    setSaving(true)
    setSaveError('')
    setSaveOk(false)
    try {
      const result = await botConfigService.updateConfig(scope, botId, config)
      setConfig(result.config)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500) // dismiss "Saved" after 2.5 s
    } catch {
      setSaveError('Save failed — check connection to the module backend.')
    } finally {
      setSaving(false)
    }
  }

  const toggle = (section: keyof typeof open) => // flip a section's open state
    setOpen((prev) => ({ ...prev, [section]: !prev[section] }))

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
        <button
          type="button"
          onClick={() => navigate('/bots')}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1"
          title="Back to bots"
        >←</button>
        <span className="text-2xl">{bot.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white text-sm">{bot.name}</p>
          {bot.description && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{bot.description}</p>}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_BADGE[bot.type] ?? TYPE_BADGE.custom}`}>
          {BOT_TYPES.find((t) => t.value === bot.type)?.label ?? bot.type}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50 dark:bg-slate-900 rounded-b-xl">

        {/* Principals — shown only when schema declares a principals type */}
        {principalsType && (
          <section>
            <SectionHeader title="Principals" open={open.principals} onToggle={() => toggle('principals')} />
            {open.principals && (
              <div className="mt-2">
                {loadingConfig || loadingEntities ? (
                  <div className="flex justify-center py-4"><Spinner /></div>
                ) : showWatchlist ? (
                  <WatchlistSection entities={entities} teams={teams} scope={scope} botId={botId} onEntitiesChange={setEntities} />
                ) : principalsType === 'risk_profiles' ? (
                  <RiskProfilesSection teams={teams} config={config} riskLevels={riskLevels} onConfigChange={handleConfigChange} />
                ) : (
                  <TeamsSection teams={teams} />
                )}
              </div>
            )}
          </section>
        )}

        {/* Configurations */}
        {configFields.length > 0 && (
          <section>
            <SectionHeader title="Configurations" open={open.configurations} onToggle={() => toggle('configurations')} />
            {open.configurations && (
              <div className="mt-2 space-y-1.5">
                {configFields.map((field) => (
                  <ConfigFieldRow key={field.key} field={field} value={config[field.key]} onChange={handleConfigChange} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Processes */}
        <section>
          <SectionHeader title="Processes" open={open.processes} onToggle={() => toggle('processes')} />
          {open.processes && (
            <div className="mt-2">
              <ProcessesSection scope={scope} botId={botId} />
            </div>
          )}
        </section>

        {/* Scheduler */}
        {schedulerFields.length > 0 && (
          <section>
            <SectionHeader title="Scheduler" open={open.scheduler} onToggle={() => toggle('scheduler')} />
            {open.scheduler && (
              <div className="mt-2 space-y-1.5">
                {schedulerFields.map((field) => (
                  <ConfigFieldRow key={field.key} field={field} value={config[field.key]} onChange={handleConfigChange} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Save bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          {saveError ? (
            <p className="text-xs text-red-500">{saveError}</p>
          ) : saveOk ? (
            <p className="text-xs text-emerald-500">Saved</p>
          ) : (
            <span />
          )}
          <Btn onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm">
            {saving ? <Spinner size="sm" /> : 'Save changes'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
