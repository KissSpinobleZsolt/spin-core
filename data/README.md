# spin-core / data

First-run seed data. The backend reads this file once (when the database is empty) to populate default content.

## seed.json

Mounted read-only into the backend container at `SEED_PATH` (`/app/seed-data/seed.json` by default).

### Top-level structure

```json
{
  "settings": {
    "theme": { "default_theme": "dark" },
    "modules": [ … ]
  },
  "dashboard": { "content": "…markdown…" },
  "bots": [ … ]
}
```

### `settings.modules` — module entries (optional)

Each entry is inserted into the PostgreSQL `modules` table on first startup (skipped if the table is already populated). Module-specific configuration (including companion bots) should live in the module's own `manifest.json` rather than here — see "Module-carried bots" below.

Fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID string | No | Stable primary key. If omitted, a random UUID is generated. |
| `name` | string | Yes | Display name shown in the sidebar |
| `description` | string | No | Short description shown in the discovery panel and admin list |
| `scope` | string | Yes | Webpack container scope — must match `name` in `webpack.config.js` |
| `component` | string | Yes | Exposed component path, e.g. `./App` |
| `route` | string | Yes | URL slug under `/modules/` |
| `icon` | string | No | Emoji (default `🧩`) |
| `enabled` | bool | No | Sidebar visibility (default `true`) |
| `roles` | string[] | No | RBAC roles that can access the module (default `["user", "admin"]`) |
| `remote_url` | string | Yes | Browser-accessible URL of `remoteEntry.js` |
| `presets` | object | No | `{ "i18n": {}, "layout": {}, "settings": {} }` — JSON blobs injected as props into the remote component |
| `backend_url` | string | No | URL of the module's own plugin backend service. When set, the core backend proxies `/api/plugin/{scope}/…` requests to it. Omit for frontend-only modules. |

### `bots` — global bot entries

Each entry is inserted into the PostgreSQL `bots` table when the table is empty. Only add bots here that are not tied to a specific module (e.g. the "AI Assistant" with `"modules": ["core"]`). Module-specific bots belong in the module's `manifest.json` — they are created automatically when the module is registered.

Fields: `name`, `description`, `type`, `provider` (`"ollama"` | `"anthropic"` | `"openai"` — defaults to `"ollama"`), `model`, `system_prompt`, `icon`, `active`, `restricted`, `modules`.

### Module-carried bots

A module's `manifest.json` can declare its own bots in a top-level `bots` array:

```json
{
  "scope": "myModule",
  "bots": [
    {
      "name": "My Bot",
      "type": "communicator",
      "description": "…",
      "model": "",
      "system_prompt": "…",
      "icon": "🤖",
      "active": true,
      "restricted": "user"
    }
  ]
}
```

The backend provisions these bots automatically (idempotently, keyed on `name + module_id`) when:
- The module is registered via `MODULE_REGISTRY_URLS` auto-discovery on startup.
- The module is manually created via **Admin → Modules** (the backend fetches the manifest from `remote_url` after saving).

### `dashboard.content`

Markdown string used as the initial content for the dashboard page (`page_responses` table, key `home`). Editable by admins via the platform without touching this file.

## Behaviour

- Seed runs **once** — when the `modules` table is empty for modules, `bots` table is empty for bots, etc.
- Subsequent restarts are **no-ops** for already-seeded tables.
- If `seed.json` is absent or malformed, the backend logs a warning and uses built-in defaults.
- After the seed run, modules can be added, edited, and deleted through **Admin → Modules** without touching this file.
- `MODULE_REGISTRY_URLS` auto-discovery runs every startup and inserts new scopes that are not yet in the DB — it never overwrites admin edits.
