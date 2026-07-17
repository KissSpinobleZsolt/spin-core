import { useEffect, useRef } from 'react'
import i18n from '../index'
import { useHealth, useAuth } from '@context'
import { useI18nStore } from '@store'
import { reloadTranslations } from './reloadTranslations'

export function useI18nSync(): boolean {
  const ready = useI18nStore(s => s.ready)      // read from global store so any component can check readiness
  const setReady = useI18nStore(s => s.setReady)  // stable reference — never changes across renders
  const health = useHealth()
  const lastVersionRef = useRef<string | undefined>(undefined)  // tracks last seen translation version to detect bumps
  const { user } = useAuth()
  const prevUserRef = useRef(user)  // captures previous user to detect the null→non-null login transition

  // Initial translation load; also subscribes to languageChanged so bundle reloads on language switch
  useEffect(() => {
    reloadTranslations(i18n.language)  // fetch the active language bundle on first mount
      .then(() => setReady(true))  // unblock Layout once the bundle arrives
      .catch(() => setReady(true))  // treat fetch errors as "ready" — UI degrades gracefully with missing keys

    function onLangChange(lang: string) {
      lastVersionRef.current = undefined  // reset version anchor so the next health tick is treated as a new baseline
      reloadTranslations(lang)  // fetch the new language bundle immediately on switch
    }
    i18n.on('languageChanged', onLangChange)
    return () => {
      i18n.off('languageChanged', onLangChange)  // clean up listener on unmount (e.g. logout)
    }
  }, [setReady])  // setReady is stable; effect runs once on mount

  // Hot-reload translations when the health worker detects a version bump for the active language
  useEffect(() => {
    if (!ready) return  // skip until initial bundle has loaded to avoid double-fetching on mount
    const version = health.translations?.[i18n.language]
    if (!version) return  // health payload hasn't included a translation timestamp yet
    if (lastVersionRef.current !== undefined && lastVersionRef.current !== version) {
      reloadTranslations(i18n.language)  // version changed — merge the updated bundle without a page refresh
    }
    lastVersionRef.current = version  // update baseline so the next tick compares against the new version
  }, [health.translations, ready])

  // Reload after login — the pre-auth fetch returned 401; retry once the token is available
  useEffect(() => {
    const prev = prevUserRef.current
    prevUserRef.current = user  // advance the ref before the conditional so re-renders don't retrigger
    if (user && !prev) {
      reloadTranslations(i18n.language)  // null→non-null transition: fetch the authenticated bundle
    }
  }, [user])

  return ready
}
