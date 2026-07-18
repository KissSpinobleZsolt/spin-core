import { useState } from 'react' // local add/remove state
import { botConfigService, type BotEntity, type BotTeam } from '@services' // entity CRUD + types
import { Toggle } from '@components/ui/toggle' // active/inactive toggle
import { Btn } from '@components/ui/button' // add button
import { Spinner } from '@components/ui/spinner' // loading indicator

export function WatchlistSection({ // manages watched symbols per team
  entities,
  teams,
  scope,
  botId,
  onEntitiesChange,
}: {
  entities: BotEntity[]
  teams: BotTeam[]
  scope: string
  botId: string
  onEntitiesChange: (updated: BotEntity[]) => void
}) {
  const [addSymbol, setAddSymbol] = useState('') // ticker input value
  const [addTeamId, setAddTeamId] = useState(teams[0]?.id ?? '') // default team for new symbol
  const [adding, setAdding] = useState(false) // add-in-progress flag
  const [addError, setAddError] = useState('') // last add error message

  async function handleAdd() { // POST new entity then append to local state
    if (!addSymbol.trim() || !addTeamId) return
    setAdding(true)
    setAddError('')
    try {
      const entity = await botConfigService.addEntity(scope, botId, {
        team_id: addTeamId,
        symbol: addSymbol.trim().toUpperCase(),
      })
      onEntitiesChange([...entities, entity])
      setAddSymbol('')
    } catch {
      setAddError('Failed to add symbol — check the ticker is valid.')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(entity: BotEntity, active: boolean) { // optimistic toggle with rollback on failure
    onEntitiesChange(entities.map((e) => (e.id === entity.id ? { ...e, active } : e)))
    try {
      await botConfigService.patchEntity(scope, entity.id, { active })
    } catch {
      onEntitiesChange(entities.map((e) => (e.id === entity.id ? { ...e, active: entity.active } : e)))
    }
  }

  async function handleDelete(entityId: string) { // optimistic delete; silently re-appears on refresh if server fails
    onEntitiesChange(entities.filter((e) => e.id !== entityId))
    try {
      await botConfigService.deleteEntity(scope, entityId)
    } catch {
      // deletion failed silently; a manual refresh will restore it
    }
  }

  const grouped = teams.reduce<Record<string, BotEntity[]>>((acc, t) => { // group entities by team for rendering
    acc[t.id] = entities.filter((e) => e.team_id === t.id)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <div key={team.id}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1">{team.name}</p>
          <div className="space-y-1">
            {grouped[team.id]?.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 px-3 py-2 italic">No symbols tracked yet.</p>
            )}
            {grouped[team.id]?.map((entity) => (
              <div key={entity.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <code className="text-xs font-mono font-bold text-slate-800 dark:text-white w-16 shrink-0">{entity.symbol}</code>
                <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate">{entity.display_name || entity.symbol}</span>
                {entity.exchange && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">{entity.exchange}</span>
                )}
                <Toggle checked={entity.active} onChange={(v) => handleToggle(entity, v)} />
                <button type="button" onClick={() => handleDelete(entity.id)} className="text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-colors shrink-0" title="Remove">✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <input
          type="text"
          value={addSymbol}
          onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Ticker (e.g. AAPL)"
          className="flex-1 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={addTeamId}
          onChange={(e) => setAddTeamId(e.target.value)}
          className="text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Btn onClick={handleAdd} disabled={adding || !addSymbol.trim()} className="px-4 py-2 text-sm shrink-0">
          {adding ? <Spinner size="sm" /> : '+ Add'}
        </Btn>
      </div>
      {addError && <p className="text-xs text-red-500 px-1">{addError}</p>}
    </div>
  )
}
