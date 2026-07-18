import { DocPageShell } from '@components/layout/docPageShell'
import { Card } from '@components/ui/Card'

// Demo showing DocPageShell padding, centring, and prop overrides
export function DocShellDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">DocPageShell</code>
        {' '}adds <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">p-6</code> and centres the column.
        Props: <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">maxWidth</code> (default <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">max-w-4xl</code>),
        {' '}<code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">gap</code> (default <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">space-y-6</code>).
      </p>
      <DocPageShell maxWidth="max-w-2xl"> {/* narrowed to max-w-2xl for this demo */}
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">Padded + centred — like every docs page</p></Card>
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">Same shell used by Api, UI, Deployment, Components</p></Card>
      </DocPageShell>
    </div>
  )
}
