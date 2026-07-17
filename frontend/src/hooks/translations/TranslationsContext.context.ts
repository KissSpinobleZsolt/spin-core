import { createContext, useContext, createElement } from 'react'
import type { ReactNode } from 'react'
import { useTranslations, type TranslationsContextValue } from './useTranslations.hook'

/** React context holding the translations editor state. */
const TranslationsContext = createContext<TranslationsContextValue | null>(null)

/** Provides the translations editor state to all descendants. */
export function TranslationsProvider({ children }: { children: ReactNode }) {
  const value = useTranslations()
  // createElement avoids adding JSX to a .ts file — the hook file stays JSX-free
  return createElement(TranslationsContext.Provider, { value }, children)
}

/** Returns the translations editor context; must be inside <TranslationsProvider>. */
export function useTranslationsContext(): TranslationsContextValue {
  const ctx = useContext(TranslationsContext)
  if (!ctx) throw new Error('useTranslationsContext must be used inside <TranslationsProvider>')
  return ctx
}
