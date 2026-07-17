import type { ModalProps } from './ModalProps.type'

export function Modal({ title, onClose, maxWidth = 'max-w-lg', children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className={`w-full ${maxWidth} mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">&times;</button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
