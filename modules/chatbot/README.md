# spin-core / modules / chatbot

AI chatbot Module Federation remote for the spin-core platform. Powered by a local Ollama instance — no external API keys or costs.

- **Scope**: `chatbot`
- **Port**: 3002 (standalone) / 80 (Docker)
- **Stack**: React 18 (via webpack externals), webpack 5

## Exposed components

| Component | Loaded by | Purpose |
|-----------|-----------|---------|
| `./ChatPage` | `FederatedPage` (sidebar link `/modules/chatbot`) | Full-page chat interface |
| `./ChatWidget` | `ChatBubble` in Layout | Floating bubble on every authenticated page |

Both components communicate with the backend via `POST /api/chat`, which streams NDJSON from Ollama. The remote has no direct knowledge of Ollama — all AI calls go through the backend.

## How it connects to Ollama

```
ChatWidget / ChatPage
    └─ POST /api/chat  (JWT-protected, streaming NDJSON)
          └─ FastAPI backend
                └─ httpx → Ollama /api/chat  (OLLAMA_URL / OLLAMA_MODEL)
```

The model is controlled by the `OLLAMA_MODEL` backend env var — the frontend receives streamed token chunks and has no knowledge of which model is running.

## Running standalone

```bash
npm install
npm start   # or: pnpm install && pnpm start
```

Opens at [http://localhost:3002](http://localhost:3002). The standalone shell uses CDN React UMD scripts. Note: the chat functionality requires the backend running on port 8000.

## Building for production / Docker

```bash
npm run build
docker build -t spin-core-chatbot:latest .
```

Served by nginx on port 80. The compose service maps it to host port 3002.

## Auto-seeding

The backend seeds the chatbot as a default module on first run — no manual registration in Settings is needed. The seeded `remote_url` comes from the `CHATBOT_REMOTE_URL` env var (`http://localhost:3002/remoteEntry.js` by default).

To re-seed after deleting a stale entry: restart the backend. The guard checks for `scope == "chatbot"` and inserts the correct entry if absent.

## Settings-aware bubble

`ChatBubble.tsx` in the host reads the chatbot module entry from `SettingsContext`:
- Uses `mod.remote_url` when available (admin-configurable in Settings → Modules).
- Falls back to `VITE_CHATBOT_REMOTE_URL` (build-time env var) for non-admin users.
- Hides entirely if the chatbot module is disabled in Settings.

This means an admin can point the bubble at a different URL (e.g. a Kubernetes NodePort) without rebuilding the frontend.

## File structure

```
chatbot/
├── src/
│   ├── ChatPage.jsx   # Full-page chat interface
│   ├── ChatWidget.jsx # Floating bubble + inline chat panel
│   ├── bootstrap.js   # Async boundary (required for MF)
│   └── index.js       # Entry point — imports bootstrap
├── public/
│   ├── index.html     # Standalone shell with CDN React UMD scripts
│   └── manifest.json  # Module descriptor — served at /manifest.json
├── webpack.config.js
└── Dockerfile
```
