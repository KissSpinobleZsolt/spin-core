import { useTranslationsContext } from '@hooks'
import { ErrorBanner } from '@components/ui/ErrorBanner'
import { TranslationsToolbar } from './toolbar'
import { TranslationsGrid } from './grid'

function TranslationsContent() {
  const { error } = useTranslationsContext()
  return (
    <div className="space-y-4">
      <TranslationsToolbar />
      {error && <ErrorBanner message={error} />}
      <TranslationsGrid />
    </div>
  )
}

export { TranslationsContent }
