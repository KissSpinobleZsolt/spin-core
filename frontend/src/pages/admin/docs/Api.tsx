import { useState } from 'react'
import { PageTitle } from '../../../components/ui/PageTitle'
import { DocPageShell } from '../../../components/layout/DocPageShell'
import { Input } from '../../../components/ui/Input'

// ─── Types ────────────────────────────────────────────────────────────────────

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*'
type Auth   = 'Public' | 'Bearer' | 'Admin'

interface Endpoint {
  method: Method
  path: string
  auth: Auth
  description: string
}

interface ApiGroup {
  id: string
  title: string
  note?: string
  endpoints: Endpoint[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const GROUPS: ApiGroup[] = [
  {
    id: 'health',
    title: 'Health',
    note: 'No authentication required. The api field is always true when the endpoint responds.',
    endpoints: [
      { method: 'GET', path: '/api/health', auth: 'Public',
        description: 'Returns liveness of the API, PostgreSQL, and ClickHouse. Response: { api, postgres, clickhouse, translations }.' },
    ],
  },
  {
    id: 'auth',
    title: 'Auth',
    endpoints: [
      { method: 'POST', path: '/api/auth/login', auth: 'Public',
        description: 'Returns JWT + user object. Body: { email, password }. Login event is appended to ClickHouse.' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard & User',
    endpoints: [
      { method: 'GET',   path: '/api/dashboard',    auth: 'Bearer', description: 'Returns dashboard page content from PostgreSQL.' },
      { method: 'PATCH', path: '/api/user/theme',   auth: 'Bearer', description: "Update the current user's preferred theme. Body: { theme }." },
    ],
  },
  {
    id: 'bots',
    title: 'Bots',
    note: 'Bots are stored in PostgreSQL. A bot with no modules is always inactive regardless of the active field.',
    endpoints: [
      { method: 'GET',    path: '/api/bots/types',  auth: 'Bearer', description: 'List all bot type definitions from the bot_types table.' },
      { method: 'GET',    path: '/api/bots',        auth: 'Bearer', description: 'List bots. Admins see all; others see active bots matching their roles. Optional ?module_id={uuid} filter.' },
      { method: 'POST',   path: '/api/bots',        auth: 'Admin',  description: 'Create a bot.' },
      { method: 'GET',    path: '/api/bots/{id}',   auth: 'Bearer', description: 'Get one bot (active + role-checked for non-admins).' },
      { method: 'PUT',    path: '/api/bots/{id}',   auth: 'Admin',  description: 'Replace a bot.' },
      { method: 'DELETE', path: '/api/bots/{id}',   auth: 'Admin',  description: 'Delete a bot.' },
    ],
  },
  {
    id: 'chat',
    title: 'Chat',
    note: 'POST /api/chat streams NDJSON. Each line: { "message": { "role": "assistant", "content": "…" }, "done": false }. Final: { "done": true }. On error: { "error": "…" }.',
    endpoints: [
      { method: 'POST', path: '/api/chat',               auth: 'Bearer', description: 'Stream a chat response. Body: { messages, model?, bot_id?, module_id? }.' },
      { method: 'POST', path: '/api/chat/abort',         auth: 'Bearer', description: 'Log a user-initiated stream abort. Body: { bot_id }.' },
      { method: 'GET',  path: '/api/chat/logs',          auth: 'Admin',  description: 'Paginated chat history. Params: from, to, user_email, limit, offset. Returns { items, total }.' },
      { method: 'GET',  path: '/api/chat/logs/summary',  auth: 'Admin',  description: 'Hourly aggregates from module_chatbot_logs_mv. Params: from, to. Returns { items, total }.' },
    ],
  },
  {
    id: 'logs',
    title: 'App Logs',
    note: 'All log endpoints accept from and to as ISO datetime query params. Default range: start of current month → now.',
    endpoints: [
      { method: 'GET',  path: '/api/logs',         auth: 'Admin', description: 'Raw app_logs rows. Params: limit, offset, event_type, user_email, from, to. Returns { items, total }.' },
      { method: 'GET',  path: '/api/logs/summary', auth: 'Admin', description: 'Hourly aggregates from app_logs_mv. Params: from, to, event_type, path, limit, offset. Returns { items, total }.' },
      { method: 'POST', path: '/api/logs/purge',   auth: 'Admin', description: 'Force-OPTIMIZE all ClickHouse log tables to enforce TTL expiry immediately. Returns { purged, errors }.' },
    ],
  },
  {
    id: 'module-logs',
    title: 'Module Logs',
    note: 'Log tables (module_{scope}_logs) are created automatically when a module is registered.',
    endpoints: [
      { method: 'POST', path: '/api/module-logs/{moduleId}',         auth: 'Bearer', description: 'Write a log entry. Body: { event_type, details }.' },
      { method: 'GET',  path: '/api/module-logs/{moduleId}',         auth: 'Admin',  description: 'Raw module log rows. Params: limit, offset, event_type, from, to. Returns { items, total }.' },
      { method: 'GET',  path: '/api/module-logs/{moduleId}/summary', auth: 'Admin',  description: 'Hourly aggregates from module_{scope}_logs_mv. Returns { items, total }.' },
    ],
  },
  {
    id: 'module-data',
    title: 'Module Data',
    note: 'Namespaced document store in PostgreSQL (module_documents table), scoped by module_id + collection.',
    endpoints: [
      { method: 'GET',    path: '/api/module-data/{moduleId}/{collection}',         auth: 'Bearer', description: 'List documents. Params: limit, skip.' },
      { method: 'POST',   path: '/api/module-data/{moduleId}/{collection}',         auth: 'Bearer', description: 'Insert a document.' },
      { method: 'PUT',    path: '/api/module-data/{moduleId}/{collection}/{docId}', auth: 'Bearer', description: 'Update a document.' },
      { method: 'DELETE', path: '/api/module-data/{moduleId}/{collection}/{docId}', auth: 'Bearer', description: 'Delete a document.' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    note: 'Modules are stored in PostgreSQL. settings.json holds only the theme key.',
    endpoints: [
      { method: 'PATCH',  path: '/api/settings/theme',                    auth: 'Admin', description: 'Update default theme.' },
      { method: 'GET',    path: '/api/settings/modules',                  auth: 'Admin', description: 'List registered modules from PostgreSQL.' },
      { method: 'POST',   path: '/api/settings/modules',                  auth: 'Admin', description: 'Create a module. Provisions ClickHouse tables; fetches manifest to auto-create bots and load i18n.' },
      { method: 'POST',   path: '/api/settings/modules/{id}/reset-i18n', auth: 'Admin', description: 'Re-merge the i18n snapshot from module.presets.i18n into the translations table.' },
      { method: 'PUT',    path: '/api/settings/modules/{id}',             auth: 'Admin', description: 'Update a module.' },
      { method: 'DELETE', path: '/api/settings/modules/{id}',             auth: 'Admin', description: 'Delete a module.' },
      { method: 'GET',    path: '/api/settings/modules/discover',         auth: 'Admin', description: 'Scan MODULE_REGISTRY_URLS for manifest.json. Returns discovered modules with already_registered flag.' },
    ],
  },
  {
    id: 'i18n',
    title: 'Translations (i18n)',
    note: 'GET /api/i18n/{lang} is intentionally public so the frontend can load translations before the user logs in.',
    endpoints: [
      { method: 'GET', path: '/api/i18n/{lang}', auth: 'Public', description: 'Return full translation object for lang (e.g. en, ro).' },
      { method: 'PUT', path: '/api/i18n/{lang}', auth: 'Admin',  description: 'Replace translation object for lang.' },
    ],
  },
  {
    id: 'model-status',
    title: 'Model Status & LLM Management',
    endpoints: [
      { method: 'GET',    path: '/api/model-status',                auth: 'Public', description: 'Check whether required Ollama models (OLLAMA_MODEL, OLLAMA_EMBED_MODEL) are pulled and ready.' },
      { method: 'GET',    path: '/api/model-status/installed',      auth: 'Public', description: 'List all models installed in Ollama (name, family, params, quantization, size).' },
      { method: 'GET',    path: '/api/model-status/stream',         auth: 'Public', description: 'SSE stream — pushes pull progress every second until all required models are ready.' },
      { method: 'POST',   path: '/api/model-status/pull',           auth: 'Admin',  description: 'Trigger background pull of an Ollama model. Body: { name: "llama3.2:3b" }. Returns immediately.' },
      { method: 'DELETE', path: '/api/model-status/{model_name}',   auth: 'Admin',  description: 'Delete a model from Ollama.' },
    ],
  },
  {
    id: 'plugin',
    title: 'Plugin Proxy',
    note: 'The Authorization header is forwarded verbatim. Module backends validate the same JWT_SECRET_KEY. Returns 404 if the module has no backend_url.',
    endpoints: [
      { method: '*', path: '/api/plugin/{scope}/{path}', auth: 'Bearer', description: 'Proxy any HTTP method to {backend_url}/{path} of the named module.' },
    ],
  },
]

// ─── Style maps ───────────────────────────────────────────────────────────────

const METHOD_CLS: Record<Method, string> = {
  GET:    'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400',
  POST:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400',
  PUT:    'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400',
  PATCH:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  DELETE: 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400',
  '*':    'bg-slate-100  dark:bg-slate-700     text-slate-600  dark:text-slate-300',
}

const AUTH_CLS: Record<Auth, string> = {
  Public: 'text-slate-400',
  Bearer: 'text-blue-500 dark:text-blue-400',
  Admin:  'text-red-500  dark:text-red-400',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: Method }) {
  return (
    <span className={`inline-block font-mono text-[10px] font-bold px-1.5 py-0.5 rounded w-14 text-center shrink-0 ${METHOD_CLS[method]}`}>
      {method}
    </span>
  )
}

function GroupCard({ group }: { group: ApiGroup }) {
  return (
    <div id={group.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h2 className="font-bold text-slate-800 dark:text-white">{group.title}</h2>
        {group.note && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{group.note}</p>
        )}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800">
        {group.endpoints.map((ep, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3">
            <MethodBadge method={ep.method} />
            <code className="text-xs font-mono text-slate-700 dark:text-slate-200 pt-0.5 shrink-0 min-w-0 break-all">
              {ep.path}
            </code>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-600 dark:text-slate-300">{ep.description}</p>
            </div>
            <span className={`text-[10px] font-medium shrink-0 pt-0.5 ${AUTH_CLS[ep.auth]}`}>{ep.auth}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsApi() {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? GROUPS.filter(g =>
        g.title.toLowerCase().includes(query.toLowerCase()) ||
        g.endpoints.some(
          e => e.path.toLowerCase().includes(query.toLowerCase()) ||
               e.description.toLowerCase().includes(query.toLowerCase()),
        ),
      )
    : GROUPS

  return (
    <DocPageShell>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <PageTitle>API Reference</PageTitle>
          <p className="text-sm text-slate-500 mt-1">
            Base URL: <code className="font-mono text-blue-600 dark:text-blue-400">http://localhost:8000</code>
            &ensp;·&ensp;Auth: <code className="font-mono">Authorization: Bearer &lt;jwt&gt;</code>
          </p>
        </div>
        <div className="w-64">
          <Input placeholder="Search endpoints…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as Method[]).map(m => (
            <span key={m} className={`font-mono font-bold px-2 py-0.5 rounded ${METHOD_CLS[m]}`}>{m}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-slate-500 ml-auto">
          <span className={AUTH_CLS.Public}>Public</span>
          <span className={AUTH_CLS.Bearer}>Bearer</span>
          <span className={AUTH_CLS.Admin}>Admin</span>
        </div>
      </div>

      {/* Quick-jump */}
      {!query && (
        <div className="flex flex-wrap gap-2">
          {GROUPS.map(g => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            >
              {g.title}
            </a>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">No endpoints match "{query}"</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(g => <GroupCard key={g.id} group={g} />)}
        </div>
      )}
    </DocPageShell>
  )
}
