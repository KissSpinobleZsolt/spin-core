export function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">{message}</p>
  )
}
