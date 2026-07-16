export const BOT_TYPES = [
  { value: 'communicator', label: 'Communicator' },
  { value: 'custom',       label: 'Custom' },
]

export const CUSTOM_ICONS = ['🤖', '💬', '👁️', '📊', '📖', '🔍', '📈', '🎛️', '⚙️', '🧠', '🛠️', '🚀']

export const TYPE_BADGE: Record<string, string> = {
  communicator: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  custom:       'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}
