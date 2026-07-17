import type { InputProps } from './InputProps.type'

export function Input({ label, id, className = '', ...props }: InputProps) {
  const cls = `w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${className}`
  if (label) return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
      <input id={id} className={cls} {...props} />
    </div>
  )
  return <input id={id} className={cls} {...props} />
}
