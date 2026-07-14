# spin-core / modules / hello-world

Reference Module Federation remote for the spin-core platform. Demonstrates the minimal setup for a working MF remote that integrates with the host.

- **Scope**: `helloWorld`
- **Exposed component**: `./App` — simple counter widget
- **Port**: 3001 (standalone) / 80 (Docker)
- **Stack**: React 18 (via webpack externals), webpack 5

## Running standalone

```bash
npm install
npm start
```

Opens at [http://localhost:3001](http://localhost:3001). Uses CDN React UMD scripts from `public/index.html` — no host needed.

## Building for production / Docker

```bash
npm run build        # outputs to dist/
docker build -t spin-core-hello-world:latest .
```

The Docker image (`nginx:alpine`) serves `dist/` on port 80. The compose service maps it to host port 3001.

## Registering in the platform

Start the service, then in spin-core Settings → Modules → **🔍 Scan for modules**. The backend fetches `http://hello-world/manifest.json` (Docker internal URL) and surfaces it in the discovery panel. Click **Add**.

Or register manually:

| Field | Value |
|-------|-------|
| Remote URL | `http://localhost:3001/remoteEntry.js` |
| Scope | `helloWorld` |
| Component | `./App` |
| Route | `hello-world` |

## Webpack config highlights

```js
// webpack.config.js
plugins: [
  new ModuleFederationPlugin({
    name: 'helloWorld',
    filename: 'remoteEntry.js',
    exposes: {
      './App': './src/App',
    },
    shared: {},   // no shared libs — React comes from host globals via externals
  }),
],
externals: {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOM',
}
```

The `externals` block is what makes the singleton contract work — the component reads `window.React` set by the host rather than bundling its own copy.

## File structure

```
hello-world/
├── src/
│   ├── App.jsx        # Exposed component — counter widget
│   ├── bootstrap.js   # Async boundary (required for MF)
│   └── index.js       # Entry point — imports bootstrap
├── public/
│   ├── index.html     # Standalone shell with CDN React UMD scripts
│   └── manifest.json  # Module descriptor — served at /manifest.json
├── webpack.config.js
└── Dockerfile
```
