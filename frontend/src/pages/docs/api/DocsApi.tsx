import { useState } from 'react'
import { PageTitle } from '@components/ui/PageTitle'
import { DocPageShell } from '../../@components/layout/docPageShell'
import { Input } from '@components/ui/input'
import type { Method } from './Method.type' // used to cast the legend method array
import { GROUPS } from './GROUPS.constant' // full list of API groups to render
import { IDS } from './IDS.constant' // ordered ids for scroll-spy
import { METHOD_CLS } from './METHOD_CLS.constant' // method badge colour classes for legend
import { AUTH_CLS } from './AUTH_CLS.constant' // auth badge colour classes for legend
import { GroupCard } from './GroupCard' // renders one endpoint group
import { useActiveSection } from '../useActiveSection.hook' // shared scroll-spy hook

// Full-page API reference with sidebar scroll-spy and search filtering.
export default function DocsApi() {
  const [query, setQuery] = useState('') // controlled search input value
  const active = useActiveSection(IDS) // currently visible section anchor id

  const searching = query.trim() !== '' // true when the user has typed a non-empty query
  const filtered = searching
    ? GROUPS.filter(g =>
        g.title.toLowerCase().includes(query.toLowerCase()) || // match on group title
        g.endpoints.some(
          e => e.path.toLowerCase().includes(query.toLowerCase()) || // match on endpoint path
               e.description.toLowerCase().includes(query.toLowerCase()), // match on description
        ),
      )
    : GROUPS // show all groups when no search query

  return (
    <DocPageShell>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <PageTitle>API Reference</PageTitle>
          <p className="text-sm text-slate-500 mt-1">
            Base URL: <code className="font-mono text-blue-600 dark:text-blue-400">http://localhost:8000</code>
            &ensp;·&ensp;Auth: <code className="font-mono">Authorization: Bearer &lt;jwt&gt;</code>
          </p>
        </div>
        <div className="w-64">
          <Input placeholder="Search endpoints…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      {/* Legend showing method colours and auth levels */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as Method[]).map(m => (
            <span key={m} className={`font-mono font-bold px-2 py-0.5 rounded ${METHOD_CLS[m]}`}>{m}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-slate-500 ml-auto">
          <span className={AUTH_CLS.Public}>Public</span>
          <span className={AUTH_CLS.Bearer}>Bearer</span>
          <span className={AUTH_CLS.Admin}>Admin</span>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {!searching && (
          <nav className="w-40 shrink-0 sticky top-0 self-start">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Groups</p>
            <ul className="space-y-0.5">
              {GROUPS.map(g => {
                const isActive = active === g.id // highlight the currently scrolled-to group
                return (
                  <li key={g.id}>
                    <a
                      href={`#${g.id}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isActive ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      {g.title}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}

        <div className="flex-1 min-w-0 space-y-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No endpoints match "{query}"</p>
          ) : (
            filtered.map(g => <GroupCard key={g.id} group={g} />) // render each filtered group card
          )}
        </div>
      </div>
    </DocPageShell>
  )
}
