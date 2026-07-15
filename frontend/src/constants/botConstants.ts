export const BOT_TYPES = [
  { value: 'chatbot',  label: 'Chatbot' },
  { value: 'watchbot', label: 'Watch Bot' },
  { value: 'tradebot', label: 'Trade Bot' },
  { value: 'custom',   label: 'Custom' },
]

export const TYPE_BADGE: Record<string, string> = {
  chatbot:  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  watchbot: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  tradebot: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  custom:   'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
}
