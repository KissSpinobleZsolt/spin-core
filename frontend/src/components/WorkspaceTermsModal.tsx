import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Btn } from './ui/Button'

const STORAGE_KEY = 'spin_workspace_accepted_v1'

export function WorkspaceTermsModal() {
  const { user } = useAuth()
  const [accepted, setAccepted] = useState(
    () => !user || localStorage.getItem(STORAGE_KEY) === user.name,
  )
  const [checked, setChecked] = useState(false)

  if (accepted || !user) return null

  function confirm() {
    localStorage.setItem(STORAGE_KEY, user!.name)
    setAccepted(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
          Welcome to spin-core
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Please read and accept the usage terms before continuing.
        </p>

        <div className="h-52 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300 space-y-4 mb-6">
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">1. Purpose</p>
            <p>
              spin-core is an open platform shell provided for educational, research, and development
              use. You may build and deploy your own modules within the scope of your assigned role.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">2. No Warranty</p>
            <p>
              This software is provided &quot;as is&quot;, without warranty of any kind. The author
              accepts no liability for outcomes arising from its use. See the MIT License for the
              full disclaimer.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">3. Data &amp; Privacy</p>
            <p>
              Session data (login token, preferences) is stored only in your browser&apos;s local
              storage. No personal data is sent to third parties.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">4. Acceptable Use</p>
            <p>
              You agree not to use this platform in ways that violate applicable law, harm other
              users, or compromise system security.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">5. License</p>
            <p>
              spin-core is released under the MIT License. You are free to use, modify, and
              distribute it in accordance with those terms.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer mb-6 select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-400 accent-blue-600 cursor-pointer"
          />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            I have read and agree to the terms above.
          </span>
        </label>

        <Btn
          onClick={confirm}
          disabled={!checked}
          className="w-full py-2.5 rounded-xl text-sm font-semibold"
        >
          Continue to spin-core
        </Btn>
      </div>
    </div>
  )
}
