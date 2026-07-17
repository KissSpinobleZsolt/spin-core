import { useState } from 'react'
import { Btn } from '../ui/button'
import { STORAGE_KEY } from './STORAGE_KEY.constant'

export function CookieConsentModal() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY)) // Hide if already answered

  if (!visible) return null

  function accept(type: 'all' | 'essential') {
    localStorage.setItem(STORAGE_KEY, type)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 flex justify-center pointer-events-none">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 pointer-events-auto">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">Cookie notice</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            We use essential browser storage (localStorage) to keep you signed in and remember your
            preferences. No tracking cookies or third-party analytics are used.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Btn variant="secondary" className="px-4 py-2" onClick={() => accept('essential')}>Essential only</Btn>
          <Btn className="px-4 py-2" onClick={() => accept('all')}>Accept all</Btn>
        </div>
      </div>
    </div>
  )
}
