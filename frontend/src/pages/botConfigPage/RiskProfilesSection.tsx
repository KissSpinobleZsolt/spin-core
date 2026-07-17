import { type BotTeam } from '@services' // team shape

export function RiskProfilesSection({ // assigns a risk level per team
  teams,
  config,
  riskLevels,
  onConfigChange,
}: {
  teams: BotTeam[]
  config: Record<string, unknown>
  riskLevels: string[]
  onConfigChange: (key: string, v: unknown) => void
}) {
  const profiles = (config.risk_profiles as Record<string, string>) ?? {} // current profile assignments
  return (
    <div className="space-y-1.5">
      {teams.map((team) => (
        <div key={team.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{team.name}</span>
          <select
            // index 1 = middle option (e.g. "Moderate"); falls back to first when the list has only one element
            value={profiles[team.id] ?? riskLevels[1] ?? riskLevels[0]}
            onChange={(e) => onConfigChange('risk_profiles', { ...profiles, [team.id]: e.target.value })}
            className="text-sm rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {riskLevels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}
