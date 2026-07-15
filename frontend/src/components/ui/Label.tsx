export function Label({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" {...props}>{children}</label>
}
