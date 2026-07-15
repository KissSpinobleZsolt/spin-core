type Variant = 'primary' | 'secondary' | 'danger'
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

const base = 'px-3 py-1.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const variants: Record<Variant, string> = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
}

export function Btn({ variant = 'primary', className = '', ...props }: BtnProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
