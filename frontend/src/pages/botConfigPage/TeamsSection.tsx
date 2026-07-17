import { type BotTeam } from '@services' // team shape

export function TeamsSection({ teams }: { teams: BotTeam[] }) { // read-only list of assigned teams
  if (teams.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 px-3 py-2 italic">
        No teams assigned yet. Assign this bot to a team from the Teams view.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      {teams.map((t) => (
        <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{t.name}</span>
          {t.role && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{t.role}</span>
          )}
        </div>
      ))}
    </div>
  )
}
