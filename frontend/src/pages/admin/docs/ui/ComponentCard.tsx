import { useState } from 'react'
import type { UIComponentDoc } from '@services' // full component doc descriptor from the service layer
import { previewRegistry } from '../previewRegistry' // maps component name → live preview FC
import { PropTable } from './PropTable' // tabular props listing

// Renders a docs card for a single UI component with switchable Props / Preview tabs.
export function ComponentCard({ doc }: { doc: UIComponentDoc }) {
  const [tab, setTab] = useState<'props' | 'preview'>('props') // active tab selection
  const Preview = previewRegistry[doc.name] // undefined when no preview is registered — hides the Preview tab entirely

  return (
    <div id={doc.name.toLowerCase()} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">{doc.name}</h2>
            {doc.export !== doc.name && (
              <code className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                {`{ ${doc.export} }`} {/* shows named export when it differs from the display name */}
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
                onClick={() => setTab(t)} // switch between props table and live preview
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
            <Preview /> // render the live interactive preview component
          )}
        </div>
      </div>
    </div>
  )
}
