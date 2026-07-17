import { useState, useEffect } from 'react'
import { PageTitle } from '../../../components/ui/PageTitle'
import { DocPageShell } from '../../../components/layout/DocPageShell'
import { Input } from '../../../components/ui/Input'
import { Spinner } from '../../../components/ui/spinner'
import { ErrorBanner } from '../../../components/ui/ErrorBanner'
import { useUIComponents } from '@context'
import { previewRegistry } from './previewRegistry'
import type { UIComponentDoc, UIComponentProp } from '@services'

// ─── Sub-components ───────────────────────────────────────────────────────────

function PropTable({ props }: { props: UIComponentProp[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {['Prop', 'Type', 'Default', 'Description'].map(h => (
              <th key={h} className="text-left pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {props.map(p => (
            <tr key={p.name}>
              <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {p.name}{p.required && <span className="ml-1 text-red-500">*</span>}
              </td>
              <td className="py-2 pr-4 font-mono text-slate-600 dark:text-slate-300 max-w-[200px]">{p.type}</td>
              <td className="py-2 pr-4 font-mono text-slate-400 whitespace-nowrap">{p.default ?? '—'}</td>
              <td className="py-2 text-slate-600 dark:text-slate-300 leading-relaxed">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ComponentCard({ doc }: { doc: UIComponentDoc }) {
  const [tab, setTab] = useState<'props' | 'preview'>('props')
  // undefined when doc.name has no entry in previewRegistry — hides the Preview tab entirely
  const Preview = previewRegistry[doc.name]

  return (
    <div id={doc.name.toLowerCase()} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">{doc.name}</h2>
            {doc.export !== doc.name && (
              <code className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                {`{ ${doc.export} }`}
              </code>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{doc.description}</p>
        </div>
        <code className="text-[11px] bg-slate-100 dark:bg-slate-900 text-slate-500 px-2 py-1 rounded shrink-0 whitespace-nowrap">
          {doc.file}
        </code>
      </div>
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
        <code className="text-xs text-slate-500 dark:text-slate-400">
          import {'{ '}<span className="text-blue-600 dark:text-blue-400">{doc.export}</span>{' }'} from{' '}
          <span className="text-green-600 dark:text-green-400">'../../{doc.file.replace('.tsx', '')}'</span>
        </code>
      </div>
      <div className="bg-white dark:bg-slate-800">
        {Preview && (
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-5">
            {(['props', 'preview'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`mr-4 py-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="px-5 py-4">
          {tab === 'props' || !Preview ? (
            <>
              {doc.props.length > 0 ? <PropTable props={doc.props} /> : <p className="text-xs text-slate-400">No props.</p>}
              {doc.notes && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                  ℹ️ {doc.notes}
                </p>
              )}
            </>
          ) : (
            <Preview />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Active section tracking ──────────────────────────────────────────────────

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const root = document.querySelector('main')
    const visible = new Set<string>()

    const observers = ids.map(id => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) visible.add(id)
          else visible.delete(id)
          const first = ids.find(i => visible.has(i))
          if (first) setActive(first)
        },
        { root, rootMargin: '0px 0px -60% 0px', threshold: 0 },
      )
      obs.observe(el)
      return obs
    })

    return () => observers.forEach(o => o?.disconnect())
  }, [ids])

  return active
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsUI() {
  const { components, loading, error } = useUIComponents()
  const [query, setQuery] = useState('')

  const ids = components.map(d => d.name.toLowerCase())
  const active = useActiveSection(ids)

  const searching = query.trim() !== ''
  const filtered = searching
    ? components.filter(d =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.description.toLowerCase().includes(query.toLowerCase()),
      )
    : components

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
          <Input placeholder="Search components…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {!searching && (
          <nav className="w-40 shrink-0 sticky top-0 self-start">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Components</p>
            <ul className="space-y-0.5">
              {components.map(d => {
                const id = d.name.toLowerCase()
                const isActive = active === id
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
            : filtered.map(doc => <ComponentCard key={doc.name} doc={doc} />)
          }
        </div>
      </div>
    </DocPageShell>
  )
}
