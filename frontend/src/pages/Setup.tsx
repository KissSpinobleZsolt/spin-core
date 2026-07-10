import { type InputHTMLAttributes, type ReactNode, useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setupService, type ModuleInput, type SetupPayload, type Theme } from '../services/setupService'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface WizardState {
  step: number
  admin_name: string
  admin_email: string
  admin_password: string
  admin_confirm: string
  default_theme: Theme
  modules: ModuleInput[]
}

type WizardAction =
  | { type: 'SET_FIELD'; field: keyof WizardState; value: unknown }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'ADD_MODULE'; module: ModuleInput }
  | { type: 'REMOVE_MODULE'; index: number }

const TOTAL_STEPS = 5

function initialState(): WizardState {
  return {
    step: 1,
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_confirm: '',
    default_theme: 'dark',
    modules: [],
  }
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'NEXT':
      return { ...state, step: Math.min(state.step + 1, TOTAL_STEPS) }
    case 'BACK':
      return { ...state, step: Math.max(state.step - 1, 1) }
    case 'ADD_MODULE':
      return { ...state, modules: [...state.modules, action.module] }
    case 'REMOVE_MODULE':
      return { ...state, modules: state.modules.filter((_, i) => i !== action.index) }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function Label({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-300 mb-1">{children}</label>
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${props.className ?? ''}`}
    />
  )
}

function Btn({
  children,
  variant = 'primary',
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  const base = 'px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }
  return (
    <button type={type} className={`${base} ${variants[variant]}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">🚀</div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to spin-core</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          This one-time setup will configure your database, create your admin account, set your default theme, and register any remote modules.
        </p>
      </div>
      <Btn onClick={onNext}>Get started</Btn>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Admin account
// ---------------------------------------------------------------------------

function StepAdmin({
  state,
  dispatch,
  onNext,
  onBack,
}: {
  state: WizardState
  dispatch: (action: WizardAction) => void
  onNext: () => void
  onBack: () => void
}) {
  const valid =
    state.admin_name.trim().length > 0 &&
    state.admin_email.includes('@') &&
    state.admin_password.length >= 8 &&
    state.admin_password === state.admin_confirm

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Admin account</h2>
        <p className="text-slate-400 text-sm">Create the first administrator account.</p>
      </div>

      <div>
        <Label>Full name</Label>
        <Input
          value={state.admin_name}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'admin_name', value: e.target.value })}
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={state.admin_email}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'admin_email', value: e.target.value })}
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <Label>Password <span className="text-slate-500">(min 8 characters)</span></Label>
        <Input
          type="password"
          value={state.admin_password}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'admin_password', value: e.target.value })}
          placeholder="••••••••"
        />
      </div>
      <div>
        <Label>Confirm password</Label>
        <Input
          type="password"
          value={state.admin_confirm}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'admin_confirm', value: e.target.value })}
          placeholder="••••••••"
        />
        {state.admin_confirm && state.admin_password !== state.admin_confirm && (
          <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Btn variant="secondary" onClick={onBack}>Back</Btn>
        <Btn onClick={onNext} disabled={!valid}>Next</Btn>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Theme
// ---------------------------------------------------------------------------

function StepTheme({
  state,
  dispatch,
  onNext,
  onBack,
}: {
  state: WizardState
  dispatch: (action: WizardAction) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Default theme</h2>
        <p className="text-slate-400 text-sm">Users can override this in their profile.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(['dark', 'light'] as Theme[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'default_theme', value: t })}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              state.default_theme === t
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
            }`}
          >
            <div className="text-2xl mb-1">{t === 'dark' ? '🌙' : '☀️'}</div>
            <div className="font-semibold text-white capitalize">{t}</div>
            <div className="text-xs text-slate-400 mt-1">
              {t === 'dark' ? 'Dark backgrounds, reduced glare' : 'Light backgrounds, high contrast'}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Btn variant="secondary" onClick={onBack}>Back</Btn>
        <Btn onClick={onNext}>Next</Btn>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — Modules
// ---------------------------------------------------------------------------

const BLANK_MODULE: ModuleInput = {
  name: '',
  remote_url: '',
  scope: '',
  component: './App',
  route: '',
  icon: '🧩',
  enabled: true,
  roles: ['user', 'admin'],
}

function StepModules({
  state,
  dispatch,
  onNext,
  onBack,
}: {
  state: WizardState
  dispatch: (action: WizardAction) => void
  onNext: () => void
  onBack: () => void
}) {
  const [form, setForm] = useState<ModuleInput>(BLANK_MODULE)
  const [adding, setAdding] = useState(false)

  const formValid =
    form.name.trim().length > 0 &&
    form.remote_url.startsWith('http') &&
    form.scope.trim().length > 0 &&
    form.route.trim().length > 0

  function handleAdd() {
    dispatch({ type: 'ADD_MODULE', module: { ...form, route: form.route.replace(/^\//, '') } })
    setForm(BLANK_MODULE)
    setAdding(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Modules</h2>
        <p className="text-slate-400 text-sm">
          Register webpack federation remotes that will appear in the sidebar. You can add more later from Settings.
        </p>
      </div>

      {state.modules.length > 0 && (
        <ul className="space-y-2">
          {state.modules.map((m, i) => (
            <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-700 border border-slate-600">
              <div className="flex items-center gap-3">
                <span className="text-xl">{m.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{m.scope}/{m.component}</p>
                </div>
              </div>
              <Btn variant="danger" onClick={() => dispatch({ type: 'REMOVE_MODULE', index: i })}>Remove</Btn>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="space-y-3 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Display name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Analytics" />
            </div>
            <div>
              <Label>Icon (emoji)</Label>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="📊" />
            </div>
          </div>
          <div>
            <Label>Remote entry URL</Label>
            <Input value={form.remote_url} onChange={e => setForm(f => ({ ...f, remote_url: e.target.value }))} placeholder="http://analytics-host/remoteEntry.js" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Scope name</Label>
              <Input value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="analyticsRemote" />
            </div>
            <div>
              <Label>Exported component</Label>
              <Input value={form.component} onChange={e => setForm(f => ({ ...f, component: e.target.value }))} placeholder="./App" />
            </div>
          </div>
          <div>
            <Label>Route slug</Label>
            <Input value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))} placeholder="analytics" />
          </div>
          <div className="flex gap-2">
            <Btn onClick={handleAdd} disabled={!formValid}>Add module</Btn>
            <Btn variant="secondary" onClick={() => { setAdding(false); setForm(BLANK_MODULE) }}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <Btn variant="secondary" onClick={() => setAdding(true)}>+ Add module</Btn>
      )}

      <div className="flex justify-between pt-2">
        <Btn variant="secondary" onClick={onBack}>Back</Btn>
        <Btn onClick={onNext}>Next</Btn>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 6 — Review & Launch
// ---------------------------------------------------------------------------

function StepReview({
  state,
  onBack,
  onLaunch,
}: {
  state: WizardState
  onBack: () => void
  onLaunch: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Review & launch</h2>
        <p className="text-slate-400 text-sm">Confirm your settings and initialise the platform.</p>
      </div>

      <div className="space-y-3 text-sm">
        <Row label="Admin email" value={state.admin_email} />
        <Row label="Admin name" value={state.admin_name} />
        <Row label="Default theme" value={state.default_theme === 'dark' ? '🌙 Dark' : '☀️ Light'} />
        <Row label="Modules" value={state.modules.length === 0 ? 'None' : state.modules.map(m => m.name).join(', ')} />
      </div>

      <div className="flex justify-between pt-2">
        <Btn variant="secondary" onClick={onBack}>Back</Btn>
        <Btn onClick={onLaunch}>🚀 Launch</Btn>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-700">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Welcome', 'Admin', 'Theme', 'Modules', 'Review']

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done ? 'bg-green-500 text-white' : active ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-xs hidden sm:block truncate ${active ? 'text-blue-400' : 'text-slate-500'}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-0.5 flex-1 mt-[-14px] transition-colors ${done ? 'bg-green-500' : 'bg-slate-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root wizard
// ---------------------------------------------------------------------------

export default function Setup() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const navigate = useNavigate()

  function next() { dispatch({ type: 'NEXT' }) }
  function back() { dispatch({ type: 'BACK' }) }

  async function handleLaunch() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: SetupPayload = {
        admin_name: state.admin_name,
        admin_email: state.admin_email,
        admin_password: state.admin_password,
        default_theme: state.default_theme,
        modules: state.modules,
      }
      await setupService.completeSetup(payload)
      navigate('/login', { replace: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Setup failed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm">S</div>
            spin-core
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          <ProgressBar step={state.step} />

          {state.step === 1 && <StepWelcome onNext={next} />}
          {state.step === 2 && <StepAdmin state={state} dispatch={dispatch} onNext={next} onBack={back} />}
          {state.step === 3 && <StepTheme state={state} dispatch={dispatch} onNext={next} onBack={back} />}
          {state.step === 4 && <StepModules state={state} dispatch={dispatch} onNext={next} onBack={back} />}
          {state.step === 5 && (
            <>
              <StepReview state={state} onBack={back} onLaunch={handleLaunch} />
              {submitting && (
                <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Setting up, please wait…
                </div>
              )}
              {submitError && (
                <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-400 text-sm">
                  {submitError}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
