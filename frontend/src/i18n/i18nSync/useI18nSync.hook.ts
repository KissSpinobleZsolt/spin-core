import { useEffect, useRef, useState } from 'react'
import i18n from '../index'
import { useHealth, useAuth } from '@context'
import { reloadTranslations } from './reloadTranslations'

export function useI18nSync(): boolean {
  const [ready, setReady] = useState(false) // Becomes true after initial bundle loads
  const health = useHealth()
  const lastVersionRef = useRef<string | undefined>(undefined) // Tracks last seen translation version to detect bumps
  const { user } = useAuth()
  // Captures the previous user value so the login-transition effect can detect null→non-null
  // without firing on every render; initialized to the current user to skip the mount trigger
  const prevUserRef = useRef(user)

  // Initial load + language-switch handler
  useEffect(() => {
    reloadTranslations(i18n.language)
      .then(() => setReady(true))
      .catch(() => setReady(true))

    function onLangChange(lang: string) {
      lastVersionRef.current = undefined // re-anchor for new language on next health tick
      reloadTranslations(lang)
    }
    i18n.on('languageChanged', onLangChange)
    return () => {
      i18n.off('languageChanged', onLangChange)
    }
  }, [])

  // Background reload when health detects a version bump for the active language
  useEffect(() => {
    if (!ready) return
    const version = health.translations?.[i18n.language]
    if (!version) return
    if (lastVersionRef.current !== undefined && lastVersionRef.current !== version) {
      reloadTranslations(i18n.language) // Hot-reload updated bundle without full page refresh
    }
    lastVersionRef.current = version
  }, [health.translations, ready])

  // Reload translations after login — the pre-auth fetch failed (401), so we retry once the
  // token is available (null → non-null user transition)
  useEffect(() => {
    const prev = prevUserRef.current
    prevUserRef.current = user
    if (user && !prev) {
      reloadTranslations(i18n.language)
    }
  }, [user])

  return ready
}
