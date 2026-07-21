import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn } from '@components/ui/button'
import type { ModuleConfig } from '@services'

interface ManifestBot {
  name: string
  icon?: string
  [key: string]: unknown
}

interface ModuleConfigPanelProps {
  module: ModuleConfig
  reseedingId: string | null
  onReseed: (m: ModuleConfig) => void
}

/** Extract bots from either configurations.bots (nested) or top-level bots. */
function extractBots(raw: Record<string, unknown>): ManifestBot[] {
  const conf = raw.configurations as Record<string, unknown> | undefined
  const bots = (conf?.bots ?? raw.bots) as ManifestBot[] | undefined
  return Array.isArray(bots) ? bots : []
}

/** Extract i18n from either configurations.i18n (nested) or top-level i18n. */
function extractI18n(raw: Record<string, unknown>): Record<string, unknown> | null {
  const conf = raw.configurations as Record<string, unknown> | undefined
  const i18n = (conf?.i18n ?? raw.i18n) as Record<string, unknown> | undefined
  return i18n && typeof i18n === 'object' ? i18n : null
}

/** Inline expansion panel rendered below a module row in the federation table. */
export function ModuleConfigPanel({ module, reseedingId, onReseed }: ModuleConfigPanelProps) {
  const navigate = useNavigate()
  const raw = module.configuration_raw  // full manifest snapshot from registration time

  if (!raw) {
    return (
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          No manifest snapshot available. Use "Reseed bots" to trigger a fresh fetch.
        </p>
      </div>
    )
  }

  const bots = extractBots(raw)
  const i18n = extractI18n(raw)

  return (
    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 space-y-4">
      {i18n && <I18nSection i18n={i18n} />}
      {bots.length > 0 && (
        <BotsSection
          bots={bots}
          module={module}
          reseedingId={reseedingId}
          onReseed={onReseed}
          navigate={navigate}
        />
      )}
    </div>
  )
}
// ── i18n section ──────────────────────────────────────────────────────────────

function I18nSection({ i18n }: { i18n: Record<string, unknown> }) {
  const langs = Object.keys(i18n)  // e.g. ["en", "ro"]

  return (
    <div>
      <SectionHeading>i18n ({langs.length} language{langs.length !== 1 ? 's' : ''})</SectionHeading>
      <div className="flex gap-2 flex-wrap">
        {langs.map(lang => {
          const ns = i18n[lang] as Record<string, unknown> | undefined
          const nsKeys = ns ? Object.keys(ns) : []
          return (
            <div
              key={lang}
              className="rounded border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs"
            >
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{lang}</span>
              {nsKeys.length > 0 && (
                <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                  {nsKeys.join(', ')}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Bots section ───────────────────────────────────────────────────────────────

interface BotsSectionProps {
  bots: ManifestBot[]
  module: ModuleConfig
  reseedingId: string | null
  onReseed: (m: ModuleConfig) => void
  navigate: ReturnType<typeof useNavigate>
}

function BotsSection({ bots, module, reseedingId, onReseed, navigate }: BotsSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <SectionHeading>Bots ({bots.length})</SectionHeading>
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed ? '▸ show' : '▾ hide'}
        </button>
      </div>

      {!collapsed && (
        <ul className="mb-3 space-y-0.5">
          {bots.map((bot, i) => (
            <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>{bot.icon ?? '🤖'}</span>
              <span className="font-medium">{bot.name ?? `Bot ${i + 1}`}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 flex-wrap">
        <Btn variant="secondary" onClick={() => navigate(`/admin/bots?module=${module.id}`)}>
          View bots
        </Btn>
        <Btn variant="secondary" onClick={() => navigate('/bots')}>
          Configure bots
        </Btn>
        <Btn
          variant="secondary"
          disabled={reseedingId === module.id}
          onClick={() => onReseed(module)}
          title="Re-seed bots declared in this module's manifest that are not yet in the database"
        >
          {reseedingId === module.id ? '…' : 'Reseed bots'}
        </Btn>
      </div>
    </div>
  )
}

// ── Shared ─────────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
      {children}
    </h4>
  )
}
