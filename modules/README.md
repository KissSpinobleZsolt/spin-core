# spin-core / modules

Module Federation remotes for the spin-core platform. Each module is an independently buildable webpack remote that the host frontend loads at runtime via the webpack container protocol.

## Available modules

All modules live in their own GitHub repositories and are wired into spin-core as git submodules.

| Module | Repo | Frontend port | Backend port | Scope | Description |
|--------|------|--------------|--------------|-------|-------------|
| [spin-docs](spin-docs/) | [spin-module-spin-docs](https://github.com/KissSpinobleZsolt/spin-module-spin-docs) | 3001 | — | `spinDocs` | Architecture diagrams + developer docs (system role) |
| [CloudInsight AI](cloud-insight-ai/README.md) | [spi-module-cloud-insight-ai](https://github.com/KissSpinobleZsolt/spi-module-cloud-insight-ai) | 3002 | 8002 | `cloudInsightAI` | Data source upload, processing, and management |
| [AnomaScan](AnomaScan/README.md) | [spi-module-anomascan](https://github.com/KissSpinobleZsolt/spi-module-anomascan) | 3003 | 8003 | `anomaScan` | YOLO object detection and model fine-tuning |


### Submodule workflow

**First-time setup after cloning spin-core without `--recurse-submodules`:**
```bash
bash scripts/setup-workspace.sh
```

**Working on a submodule module:**
```bash
cd modules/spin-docs          # full git repo — push/PR against the upstream repo
git checkout -b feat/my-thing
# ... make changes, then:
git push origin feat/my-thing
```

**Bumping a module version in spin-core (after a module PR is merged):**
```bash
cd modules/spin-docs
git pull origin main
cd ../..
git add modules/spin-docs
git commit -m "chore: bump spin-docs submodule to <sha>"
```

> The AI assistant (chatbot) is no longer a Module Federation remote. It is now a native part of the core app — see the bot system at `/bots` and `/bots-admin`, and the floating `ChatBubble` in the layout.

## How modules work

```
Browser
  └─ Host frontend (Vite, port 3000)
       └─ federationLoader.ts
            ├─ injects <script src="http://<remote>/remoteEntry.js">
            ├─ sets window.React / window.ReactDOM  ← singleton contract
            └─ calls container.init({}) → container.get("./ComponentName")
                 └─ React component rendered inside FederatedPage
```

The host never rebuilds when modules change — it loads them live from their running servers.

## Registering a module

Modules are registered in **Admin → Modules** (`/admin/modules`). Two ways:

**Automatic (scan):** Click **🔍 Scan for modules**. The backend fetches `manifest.json` from each URL in `MODULE_REGISTRY_URLS` and returns a list. New modules show an **Add** button pre-filled from the manifest. Modules defined in `data/seed.json` are always included in the results even when their server is not running — so built-in modules that were deleted remain re-discoverable without needing their dev server up.

**Manual:** Click **+ Add Module** and fill in:

| Field | Example | Description |
|-------|---------|-------------|
| Name | `Spin Docs` | Display name in sidebar |
| Description | `Architecture diagrams` | Short description shown in the discovery panel |
| Remote URL | `http://localhost:3001/remoteEntry.js` | Browser-accessible URL of `remoteEntry.js` |
| Scope | `spinDocs` | Webpack container scope (must match `webpack.config.js`) |
| Component | `./App` | Exposed component name |
| Root slug | `spin-docs` | URL path under `/modules/` |
| Icon | `📚` | Emoji shown in sidebar |
| Presets | (auto-populated) | `{ i18n, layout, settings }` injected as `presets` prop; `i18n` is loaded automatically from the manifest on registration — do not enter it manually |

## manifest.json

Every module must serve a `manifest.json` at its root (copied to `dist/` at build time):

```json
{
  "name": "My Module",
  "scope": "myModule",
  "component": "./App",
  "route": "my-module",
  "icon": "🔧",
  "roles": ["user", "admin"],
  "description": "Short description shown in the discovery panel.",
  "remote_entry": "http://localhost:3001/remoteEntry.js",
  "backend_url": "http://my-module-backend:8000",
  "i18n": {
    "en": { "myModule": { "title": "My Module" } },
    "ro": { "myModule": { "title": "Modulul meu" } }
  },
  "bots": [
    {
      "name": "My Bot",
      "type": "communicator",
      "description": "Answers questions about this module.",
      "model": "",
      "system_prompt": "You are a helpful assistant for My Module.",
      "icon": "🤖",
      "active": true,
      "restricted": "user"
    }
  ]
}
```

`remote_entry` is the **browser-accessible** URL. The backend reads it for display only — the stored `remote_url` in PostgreSQL is the authoritative URL used by the browser.

`description` is shown in the discovery panel and the admin module list. Kept short (one sentence).

`backend_url` is **optional** — only set it if your module has its own plugin backend service. When present, the core backend registers it in the `modules` table and proxies `POST /api/plugin/{scope}/…` requests to it. Omit the field for frontend-only modules.

`i18n` is **optional** — declare per-language translation keys under your module's i18n namespace. On registration (auto-discovery or manual create) the backend stores this as `module.presets.i18n` and merges it into the translations table. Admins can re-apply it at any time via **Admin → Modules → Reset i18n to defaults**.

`bots` is **optional** — declare companion bots that the platform provisions automatically when the module is registered. Bot records are stored in PostgreSQL and ClickHouse log tables are created for each one. Registration is idempotent (keyed on `name + module_id`).

`presets.layout` and `presets.settings` are **not** part of `manifest.json` — they are set by admins in the platform UI and stored in PostgreSQL, then injected as `props.presets` into the remote component at load time.

## Plugin backends

Some modules need server-side logic (file processing, ML inference, database writes) that does not belong in the core backend. The **plugin backend pattern** keeps the core image lightweight:

```
Browser
  └─ Module frontend (remoteEntry.js)
       └─ REST calls ──► POST /api/plugin/{scope}/{path}
                              └─ core backend proxy
                                   └─ module backend (backend_url)

       └─ WebSocket ──► direct to module backend URL
                         (passed via presets.settings.backend_url)
```

**To add a backend to your module:**

1. Create `your-module/backend/` — a standalone FastAPI app.
2. Add `your-module/backend/Dockerfile` — install only what your module needs (e.g. PyTorch, ultralytics).
3. Add `"backend_url": "http://your-module-backend:8000"` to `manifest.json`.
4. Add the backend service to `docker-compose.yml` (expose DB credentials via env vars — the module backend shares the same PostgreSQL and ClickHouse instance as the core).
5. Register or re-scan the module in Admin → Modules — the core will store `backend_url` and start proxying.

The `Authorization` header is forwarded verbatim from the proxy to the module backend. Module backends validate the same `JWT_SECRET_KEY` env var.

## React singleton contract

All remotes **must** declare React as a webpack external so they use the host's React instance:

```js
// webpack.config.js in every remote
externals: {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOM',
}
```

Bundling a second React alongside the host causes `Invalid hook call` / `Cannot read properties of null (reading 'useState')`.

**Version:** remotes must use the same React major version as the host (**React 19**). A React 18 remote loaded into a React 19 host causes `TypeError` crashes because `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` changed structure between major versions. `react/jsx-runtime` does not need to be listed as an external — it can be bundled from the remote's own `node_modules` as long as the version matches.

The host sets `window.React` and `window.ReactDOM` before injecting each remote script. For standalone testing (running the remote at its own port), add the React 19 UMD scripts to `public/index.html` — they set the same globals automatically.

**`publicPath` in dev mode:** use an explicit URL instead of `'auto'` when the remote is injected cross-origin from the spin-core host. `publicPath: 'auto'` relies on `document.currentScript` which is unreliable for async cross-origin script injection and causes lazy chunks to be fetched from the wrong host (localhost:3000 instead of the module's port).

```js
// webpack.config.js — spin-docs pattern
const isProduction = process.env.NODE_ENV === 'production';
output: {
  publicPath: isProduction ? 'auto' : 'http://localhost:<YOUR_PORT>/',
}
```

## Building a new module

Use `modules/spin-docs/` as a minimal reference — it is a frontend-only webpack MF remote with no plugin backend.

1. Create `modules/your-module-name/` and copy the structure from `spin-docs/`.
2. Update `webpack.config.js`:
   - Change `name` (scope), `output.uniqueName`, and `exposes` entry.
   - Keep the `externals` block unchanged.
   - Set `devServer.port` to a free port.
   - Set `publicPath` to an explicit `http://localhost:<PORT>/` in dev mode (see React singleton contract above).
3. Update `public/manifest.json` with your module's metadata.
4. Set React 19 in `package.json` (`"react": "^19.0.0"`, `"react-dom": "^19.0.0"`), then `npm install`.
5. Run standalone: `npm start`.
6. Register via Admin → Modules → Scan, or manually.
7. Add a service entry to `docker-compose.yml` (build + port mapping + healthcheck).
