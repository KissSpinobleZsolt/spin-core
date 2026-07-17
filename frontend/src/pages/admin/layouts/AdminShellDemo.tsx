import { AdminPageShell } from '../../../components/layout/adminPageShell'
import { Card } from '../../../components/ui/Card'

// Demo showing AdminPageShell width-constraining and spacing behaviour
export function AdminShellDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">AdminPageShell</code>
        {' '}constrains width and stacks children with <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">space-y-6</code>.
        Pass <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">maxWidth</code> to override (default <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">max-w-4xl</code>).
      </p>
      <AdminPageShell maxWidth="max-w-2xl"> {/* narrowed to max-w-2xl for this demo */}
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">First card — <code className="font-mono text-xs">max-w-2xl</code></p></Card>
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">Second card — same gap as every admin page</p></Card>
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">Third card — no extra wrapper needed</p></Card>
      </AdminPageShell>
    </div>
  )
}
