import type { UIComponentProp } from '@services' // prop descriptor shape from the service layer

// Renders a table listing all props for a UI component doc entry.
export function PropTable({ props }: { props: UIComponentProp[] }) {
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
                {p.name}{p.required && <span className="ml-1 text-red-500">*</span>} {/* asterisk marks required props */}
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
