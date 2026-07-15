export const BOT_TYPES = [
  { value: 'communicator', label: 'Communicator' },
  { value: 'watcher',      label: 'Watcher' },
  { value: 'capper',       label: 'Capper' },
  { value: 'reader',       label: 'Reader' },
  { value: 'searcher',     label: 'Searcher' },
  { value: 'trader',       label: 'Trader' },
  { value: 'orchestrator', label: 'Orchestrator' },
]

export const TYPE_BADGE: Record<string, string> = {
  communicator: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  watcher:      'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  capper:       'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
  reader:       'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  searcher:     'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  trader:       'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  orchestrator: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  custom:       'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}
