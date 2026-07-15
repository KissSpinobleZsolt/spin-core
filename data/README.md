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

### `settings.modules` — module entries

Each entry is inserted into the PostgreSQL `modules` table on first startup (skipped if the table is already populated). Fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
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

### Default hello-world entry

```json
{
  "name": "Hello World",
  "description": "Example federated micro-frontend module.",
  "scope": "helloWorld",
  "component": "./App",
  "route": "hello-world",
  "icon": "👋",
  "enabled": true,
  "roles": ["user", "admin"],
  "remote_url": "http://hello-world/remoteEntry.js",
  "presets": { "i18n": {}, "layout": {}, "settings": {} }
}
```

### `bots` — bot entries

Each entry is inserted into the PostgreSQL `bots` table when the table is empty. Fields: `name`, `description`, `type` (`chatbot` | `watchbot` | `tradebot` | `custom`), `model`, `system_prompt`, `icon`, `enabled`, `roles`.

### `dashboard.content`

Markdown string used as the initial content for the dashboard page (`page_responses` table, key `home`). Editable by admins via the platform without touching this file.

## Behaviour

- Seed runs **once** — when the `modules` table is empty for modules, `bots` table is empty for bots, etc.
- Subsequent restarts are **no-ops** for already-seeded tables.
- If `seed.json` is absent or malformed, the backend logs a warning and uses built-in defaults.
- After the seed run, modules can be added, edited, and deleted through **Admin → Modules** without touching this file.
- `MODULE_REGISTRY_URLS` auto-discovery runs every startup and inserts new scopes that are not yet in the DB — it never overwrites admin edits.
