import { Suspense } from 'react'
import { TranslationsProvider } from '@hooks'
import { PageSkeletonLoader } from '@components/layout/pageSkeletonLoader'
import { TranslationsContent } from './TranslationsContent'
import { TRANSLATIONS_SKELETON_CONFIG } from './Translations.constant'

export default function Translations() {
  return (
    // Suspense must wrap Provider (not vice versa): TranslationsProvider calls useSuspenseQuery
    // which throws a Promise — Suspense must be the nearest ancestor outside the thrower to catch it.
    <Suspense fallback={<PageSkeletonLoader config={TRANSLATIONS_SKELETON_CONFIG} />}>
      <TranslationsProvider>
        <TranslationsContent />
      </TranslationsProvider>
    </Suspense>
  )
}
