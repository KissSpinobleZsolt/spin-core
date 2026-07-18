import { useState } from 'react'
import { PageTitle } from '@components/ui/PageTitle'
import { DocPageShell } from '@components/layout/docPageShell'
import { Input } from '@components/ui/input'
import { Spinner } from '@components/ui/spinner'
import { ErrorBanner } from '@components/ui/ErrorBanner'
import { useUIComponents } from '@context'
import { useActiveSection } from '../useActiveSection.hook' // shared scroll-spy hook
import { ComponentCard } from './ComponentCard' // docs card per component

// Full-page UI component reference with sidebar scroll-spy and search filtering.
export default function DocsUI() {
  const { components, loading, error } = useUIComponents() // fetch component docs from context
  const [query, setQuery] = useState('') // controlled search input value

  const ids = components.map(d => d.name.toLowerCase()) // derive scroll-spy ids from component names
  const active = useActiveSection(ids) // currently visible section anchor id

  const searching = query.trim() !== '' // true when the user has typed a non-empty query
  const filtered = searching
    ? components.filter(d =>
        d.name.toLowerCase().includes(query.toLowerCase()) || // match on component name
        d.description.toLowerCase().includes(query.toLowerCase()), // match on description
      )
    : components // show all components when no search query

  if (loading) {
    return (
      <DocPageShell maxWidth="max-w-5xl">
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      </DocPageShell>
    )
  }

  if (error) {
    return (
      <DocPageShell maxWidth="max-w-5xl">
        <ErrorBanner message={error} />
      </DocPageShell>
    )
  }

  return (
    <DocPageShell maxWidth="max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <PageTitle>UI Components</PageTitle>
          <p className="text-sm text-slate-500 mt-1">
            {components.length} components · <span className="text-red-500">*</span> required prop
          </p>
        </div>
        <div className="w-64">
          <Input placeholder="Search components…" value={query} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {!searching && (
          <nav className="w-40 shrink-0 sticky top-0 self-start">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Components</p>
            <ul className="space-y-0.5">
              {components.map(d => {
                const id = d.name.toLowerCase() // anchor id derived from component name
                const isActive = active === id // highlight the currently scrolled-to component
                return (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isActive ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      {d.name}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}

        <div className="flex-1 min-w-0 space-y-5">
          {filtered.length === 0
            ? <p className="text-sm text-slate-500 text-center py-12">No components match "{query}"</p>
            : filtered.map(doc => <ComponentCard key={doc.name} doc={doc} />) // render each filtered component card
          }
        </div>
      </div>
    </DocPageShell>
  )
}
