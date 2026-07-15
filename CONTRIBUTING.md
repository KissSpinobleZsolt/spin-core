# Contributing to spin-core

This project is open to everyone — students, interns, researchers, and developers. You are free to use it, build on it, and generate your own modules under the terms of the [MIT License](LICENSE).

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 20+
- Python 3.12+

---

## Running the project

**Development (Docker Compose):**

```bash
docker compose up
```

Frontend is served at `http://localhost:3000`, backend at `http://localhost:8000`.

**Cluster (minikube / Kubernetes):**

```bash
minikube start
kubectl apply -f k8s/
```

---

## Creating your own module

Modules are Webpack 5 Module Federation remotes. They are deployed independently — the host app does not need to be rebuilt when a module changes.

### 1. Create a new module repo

Modules live in their own GitHub repositories and are wired into spin-core as git submodules. Start by creating a repo under the organisation:

```bash
gh repo create KissSpinobleZsolt/spi-module-your-name \
  --public --description "spin-core your-name MF remote"
```

Then initialise the module directory from the `hello-world` template and push it:

```bash
cp -r modules/hello-world modules/your-module-name
cd modules/your-module-name
git init -b main
git add .
git commit -m "chore: initial commit — new module from hello-world template"
git remote add origin https://github.com/KissSpinobleZsolt/spi-module-your-name.git
git push -u origin main
cd ../..
```

Wire it as a submodule in spin-core so it is pinned to an exact commit:

```bash
git submodule add https://github.com/KissSpinobleZsolt/spi-module-your-name.git modules/your-module-name
git add .gitmodules modules/your-module-name workspace.yml
git commit -m "chore: add your-module-name submodule"
```

Update `workspace.yml` with the new module's repo URL and ports.

### 2. Edit `webpack.config.js`

Change the `name` field (the federation scope) and the key inside `exposes` to match your module:

```js
name: "your_module_name",       // must be unique across all modules
exposes: {
  "./App": "./src/App.jsx",     // component the host will load
},
```

Leave the `externals` block **untouched**. React must remain external so the module shares the host's `window.React` instance. Bundling a second copy of React will cause hook errors at runtime.

### 3. Update `public/manifest.json`

```json
{
  "name": "Your Module",
  "description": "One-line description shown in the discovery panel.",
  "scope": "your_module_name",
  "component": "./App",
  "route": "your-route",
  "icon": "🔧",
  "roles": ["admin", "user"],
  "remote_entry": "http://localhost:YOUR_PORT/remoteEntry.js"
}
```

If your module needs a backend service, add `backend_url` pointing to it (see step 3b below). Omit the field for frontend-only modules.

### 3b. (Optional) Add a plugin backend

If your module needs server-side logic (file uploads, ML inference, async jobs), create a `backend/` directory inside your module with its own FastAPI app and `Dockerfile`. The core backend will proxy `POST /api/plugin/{scope}/…` requests to your backend automatically once you declare:

```json
"backend_url": "http://your-module-backend:8000"
```

in `manifest.json`. Add the corresponding service to `docker-compose.yml` with `JWT_SECRET_KEY`, `POSTGRES_URL`, and `CLICKHOUSE_*` env vars so it can validate tokens and access the shared databases.

### 4. Run it standalone

```bash
npm install
npm start
```

Visit `http://localhost:YOUR_PORT` to verify the module works on its own.

### 5. Register the module in the host

Open the host app and go to **Admin → Modules**. Use either:

- **Scan** — if your module URL is listed in `MODULE_REGISTRY_URLS`, click Scan and then Add.
- **Manual** — fill in name, description, remote URL (`…/remoteEntry.js`), scope, component (`./App`), root slug, icon, and optionally presets (JSON blobs for i18n / layout / settings injected as props into the remote).

Module registration is stored in PostgreSQL, not in configuration files. Changes take effect immediately — no restart required.

---

## Submitting changes

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Commit your changes with a clear message.
4. Open a pull request against `main`.

---

## Academic use

If you are using this project for a university thesis or internship, you are free to do so under the MIT License. You do not need permission from the author. Include the license notice in your project as required by the license terms.
