# spin-core / modules

Module Federation remotes for the spin-core platform. Each module is an independently buildable webpack remote that the host frontend loads at runtime via the webpack container protocol.

## Available modules

| Module | Port | Scope | Description |
|--------|------|-------|-------------|
| [hello-world](hello-world/README.md) | 3001 | `helloWorld` | Reference remote — counter widget |

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

**Automatic (scan):** Click **🔍 Scan for modules**. The backend fetches `manifest.json` from each URL in `MODULE_REGISTRY_URLS` and returns a list. New modules show an **Add** button pre-filled from the manifest.

**Manual:** Click **+ Add Module** and fill in:

| Field | Example | Description |
|-------|---------|-------------|
| Name | `Hello World` | Display name in sidebar |
| Remote URL | `http://localhost:3001/remoteEntry.js` | Browser-accessible URL of `remoteEntry.js` |
| Scope | `helloWorld` | Webpack container scope (must match `webpack.config.js`) |
| Component | `./App` | Exposed component name |
| Route | `hello-world` | URL path under `/modules/` |
| Icon | `👋` | Emoji shown in sidebar |

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
  "description": "Short description for the discovery panel.",
  "remote_entry": "http://localhost:3001/remoteEntry.js"
}
```

`remote_entry` is the **browser-accessible** URL. The backend reads it for display only — the stored `remote_url` in settings is the authoritative URL used by the browser.

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

The host sets `window.React` and `window.ReactDOM` before injecting each remote script. For standalone testing (running the remote at its own port), add the React UMD scripts to `public/index.html` — they set the same globals automatically.

## Building a new module

1. Copy `modules/hello-world/` as a starting point.
2. Update `webpack.config.js`:
   - Change `name` (scope) and `exposes` entry.
   - Keep the `externals` block unchanged.
3. Update `public/manifest.json` with your module's metadata.
4. Run standalone: `npm install && npm start` (port configurable in `webpack.config.js`).
5. Register via Settings → Modules → Scan, or manually.

See [hello-world/README.md](hello-world/README.md) for a detailed walkthrough.
