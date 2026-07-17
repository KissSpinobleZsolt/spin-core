import { useState } from 'react'
import { PageTitle } from '../../../components/ui/PageTitle'
import { DocPageShell } from '../../../components/layout/DocPageShell'
import { Tabs } from '../../../components/ui/tabs'
import { Card } from '../../../components/ui/Card'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg px-4 py-3 overflow-x-auto leading-relaxed">
      {children}
    </pre>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{children}</h3>
  )
}

// ─── Docker Compose tab ───────────────────────────────────────────────────────

const DC_SERVICES = [
  { name: 'postgres',                  port: '5432',      image: 'postgres:16-alpine',                description: 'Primary DB — users, bots, modules, i18n, module data' },
  { name: 'clickhouse',                port: '8123, 9000', image: 'clickhouse/clickhouse-server:24',  description: 'Event log DB — app_logs, module logs, chat logs, MVs' },
  { name: 'ollama',                    port: '11434',     image: 'ollama/ollama',                     description: 'Self-hosted LLM server — GPU-accelerated, 24 h keep-alive' },
  { name: 'model-downloader',          port: '—',         image: 'ollama/ollama',                     description: 'One-shot: pulls qwen2.5:7b + nomic-embed-text on first start' },
  { name: 'backend',                   port: '8000',      image: 'build ./backend',                   description: 'FastAPI core — REST API, auth, streaming chat, plugin proxy' },
  { name: 'frontend',                  port: '3000',      image: 'build ./frontend',                  description: 'React 19 SPA (production Nginx build)' },
  { name: 'frontend-dev',              port: '3000',      image: 'build ./frontend (dev)',             description: 'Vite dev server with HMR — activated via --profile dev' },
  { name: 'hello-world',               port: '3001',      image: 'build ./modules/hello-world',       description: 'Reference MF remote module' },
  { name: 'cloud-insight-ai',          port: '3002',      image: 'build ./modules/cloud-insight-ai',  description: 'Data Ingestion MF remote' },
  { name: 'cloud-insight-ai-backend',  port: '8002',      image: 'build (module backend)',             description: 'Data Ingestion FastAPI backend' },
  { name: 'anomascan',                 port: '3003',      image: 'build ./modules/AnomaScan',         description: 'Vision Watch MF remote' },
  { name: 'anomascan-backend',         port: '8003',      image: 'build (module backend)',             description: 'Vision Watch backend — PyTorch + YOLO' },
  { name: 'bots-trader-platform',      port: '3004',      image: 'build (module)',                    description: 'Trading Platform MF remote' },
  { name: 'bots-trader-platform-backend', port: '8004',  image: 'build (module backend)',             description: 'Trading Platform backend' },
]

const DC_ENV = [
  { key: 'ADMIN_EMAIL',         default: 'admin@spin.local',                          description: 'Admin login email seeded on first run — change before deploying' },
  { key: 'ADMIN_PASSWORD',      default: 'change-me',                                  description: 'Admin password seeded on first run — change before deploying' },
  { key: 'ADMIN_NAME',          default: 'Admin',                                      description: 'Admin display name' },
  { key: 'JWT_SECRET_KEY',      default: 'change-me-in-production',                   description: 'JWT signing secret — change before deploying' },
  { key: 'SETTINGS_PATH',       default: '/app/data/settings.json',                   description: 'Path to settings file (theme only; modules live in Postgres)' },
  { key: 'SEED_PATH',           default: '/app/seed-data/seed.json',                  description: 'Path to first-run seed file (bots, modules, theme)' },
  { key: 'POSTGRES_URL',        default: 'postgresql://core-postgres:…@db:5432/…',   description: 'Primary DB connection string' },
  { key: 'CLICKHOUSE_URL',      default: 'clickhouse://core-ch:…@clickhouse:9000/…', description: 'Event log DB connection string' },
  { key: 'OLLAMA_URL',          default: 'http://ollama:11434',                        description: 'Ollama API base URL (inside Docker network)' },
  { key: 'OLLAMA_MODEL',        default: 'qwen2.5:7b',                                description: 'Default LLM when no bot is selected or bot has no model set' },
  { key: 'ANTHROPIC_API_KEY',   default: '(empty)',                                    description: 'Required for bots with provider = "anthropic"' },
  { key: 'OPENAI_API_KEY',      default: '(empty)',                                    description: 'Required for bots with provider = "openai" (also Groq, Mistral, Azure)' },
  { key: 'OPENAI_BASE_URL',     default: '(empty)',                                    description: 'Override for OpenAI-compatible endpoints. Leave blank for api.openai.com' },
  { key: 'MODULE_REGISTRY_URLS', default: 'http://cloud-insight-ai:80,…',             description: 'Comma-separated base URLs scanned for manifest.json on startup' },
]

function DockerTab() {
  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Quick Start</SectionTitle>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Full stack (production builds):</p>
            <Code>{'docker compose up'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Core platform + databases only (faster iteration):</p>
            <Code>{'docker compose up backend frontend postgres clickhouse ollama model-downloader'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Frontend dev server with HMR (requires core stack running):</p>
            <Code>{'docker compose --profile dev up frontend-dev'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Rebuild a service after a code change:</p>
            <Code>{'docker compose up --build backend'}</Code>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Services & Ports</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                {['Service', 'Port', 'Image / Build', 'Description'].map(h => (
                  <th key={h} className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[11px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DC_SERVICES.map(s => (
                <tr key={s.name}>
                  <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">{s.name}</td>
                  <td className="py-2 pr-4 font-mono text-slate-500 whitespace-nowrap">{s.port}</td>
                  <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{s.image}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>Environment Variables</SectionTitle>
        <p className="text-xs text-slate-500 mb-3">Set in the <code className="font-mono">backend</code> service under <code className="font-mono">environment:</code> in docker-compose.yml.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                {['Variable', 'Default', 'Description'].map(h => (
                  <th key={h} className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[11px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DC_ENV.map(e => (
                <tr key={e.key}>
                  <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">{e.key}</td>
                  <td className="py-2 pr-4 font-mono text-slate-400 whitespace-nowrap max-w-[180px] truncate">{e.default}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>GPU & WSL2 Tips</SectionTitle>
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>Ollama is configured to use 1 NVIDIA GPU via the <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 rounded">deploy.resources.reservations.devices</code> block. Requires NVIDIA Container Toolkit installed in WSL2.</p>
          <div>
            <p className="text-xs text-slate-500 mb-1">Fix TCP connection resets during large model downloads (WSL2):</p>
            <Code>{`sudo sysctl -w net.ipv4.tcp_keepalive_time=30
sudo sysctl -w net.ipv4.tcp_keepalive_intvl=10
sudo sysctl -w net.ipv4.tcp_keepalive_probes=5
# To persist: add these 3 lines to /etc/sysctl.conf`}</Code>
          </div>
          <p>All model weights are persisted in the <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 rounded">ollama_data</code> Docker volume — downloaded once, instant on subsequent starts.</p>
        </div>
      </Card>
    </div>
  )
}

// ─── Kubernetes tab ───────────────────────────────────────────────────────────

const K8S_SECRETS = [
  { key: 'JWT_SECRET_KEY',         description: 'JWT signing secret' },
  { key: 'ADMIN_EMAIL',            description: 'Admin login email seeded on first run' },
  { key: 'ADMIN_PASSWORD',         description: 'Admin password seeded on first run' },
  { key: 'ADMIN_NAME',             description: 'Admin display name' },
  { key: 'POSTGRES_USER',          description: 'PostgreSQL username' },
  { key: 'POSTGRES_PASSWORD',      description: 'PostgreSQL password' },
  { key: 'CLICKHOUSE_USER',        description: 'ClickHouse username' },
  { key: 'CLICKHOUSE_PASSWORD',    description: 'ClickHouse password' },
  { key: 'ANTHROPIC_API_KEY',      description: 'Optional — enables Anthropic Claude models' },
  { key: 'OPENAI_API_KEY',         description: 'Optional — enables OpenAI-compatible models' },
]

const K8S_PORTS = [
  { service: 'frontend',    nodePort: '30080', description: 'React SPA' },
  { service: 'backend',     nodePort: '30800', description: 'FastAPI core' },
  { service: 'hello-world', nodePort: '30001', description: 'Reference MF remote' },
]

function KubernetesTab() {
  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Prerequisites</SectionTitle>
        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
          <li><code className="font-mono text-xs">kubectl</code> connected to a cluster (K3s, GKE, EKS, bare-metal, …)</li>
          <li><code className="font-mono text-xs">kustomize</code> CLI v5+ — or <code className="font-mono text-xs">kubectl</code> ≥ 1.27 (bundles kustomize)</li>
          <li>Docker — for building and pushing images via <code className="font-mono text-xs">scripts/k8s-push.sh</code></li>
          <li>ghcr.io access — images are pushed to <code className="font-mono text-xs">ghcr.io/kissspinoblezsolt/spin-core-*</code></li>
        </ul>
        <p className="text-xs text-slate-500 mt-3">
          All resources live in the <code className="font-mono">spin-core</code> Kubernetes namespace (created by <code className="font-mono">namespace.yaml</code>).
        </p>
      </Card>

      <Card>
        <SectionTitle>Deploy Steps</SectionTitle>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">1. Copy credentials template and fill in your values:</p>
            <Code>{'cp k8s/.env.example k8s/.env\n# edit k8s/.env'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">2. Build and push images (tags with current git SHA + :latest):</p>
            <Code>{'bash scripts/k8s-push.sh'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">3. Apply manifests and wait for rollouts:</p>
            <Code>{'bash scripts/k8s-deploy.sh'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Run both steps together:</p>
            <Code>{'bash scripts/k8s-push.sh && bash scripts/k8s-deploy.sh'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">4. On first run — watch model download progress:</p>
            <Code>{'kubectl logs -n spin-core -l job-name=model-downloader -f'}</Code>
          </div>
          <p className="text-xs text-slate-500">
            The model downloader pulls <code className="font-mono">qwen2.5:7b</code> (~5.5 GB) and <code className="font-mono">nomic-embed-text:latest</code> (~270 MB) into <code className="font-mono">ollama-pvc</code>. Subsequent deploys are instant — volume persists between restarts.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Secrets (k8s/.env keys)</SectionTitle>
          <p className="text-xs text-slate-500 mb-3">Generated via <code className="font-mono">kustomize secretGenerator</code> — never committed to git.</p>
          <div className="space-y-1.5">
            {K8S_SECRETS.map(s => (
              <div key={s.key} className="flex gap-2">
                <code className="text-xs font-mono text-blue-600 dark:text-blue-400 shrink-0">{s.key}</code>
                <span className="text-xs text-slate-500">— {s.description}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>NodePort Assignments</SectionTitle>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                  {['Service', 'NodePort'].map(h => (
                    <th key={h} className="pb-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {K8S_PORTS.map(p => (
                  <tr key={p.service}>
                    <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400">{p.service}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-300">{p.nodePort} <span className="text-slate-400">({p.description})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Non-secret config (URLs, paths) lives in <code className="font-mono">configmap.yaml</code>. Ollama URL in-cluster: <code className="font-mono">http://ollama.spin-core.svc.cluster.local:11434</code>
          </p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Day-to-Day Operations</SectionTitle>
        <Code>{`# Live pod status
kubectl get pods -n spin-core -w

# Stream backend logs
kubectl logs -n spin-core -l app=backend -f

# Describe a pod (events, probe failures, OOM)
kubectl describe pod -n spin-core -l app=backend

# Redeploy backend after a code change
bash scripts/k8s-push.sh && bash scripts/k8s-deploy.sh

# Restart deployment without a new image push
kubectl rollout restart deployment/backend -n spin-core

# Re-run the model downloader (e.g. to pull a newly added model)
kubectl delete job model-downloader -n spin-core
kubectl apply -f k8s/ollama/model-downloader-job.yaml

# Tear down the namespace (volumes are deleted)
kubectl delete namespace spin-core`}</Code>
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEPLOY_TABS = [
  { key: 'docker', label: '🐳 Docker Compose' },
  { key: 'k8s',    label: '☸️ Kubernetes' },
]

export default function DocsDeployment() {
  const [tab, setTab] = useState('docker')

  return (
    <DocPageShell>
      <div>
        <PageTitle>Deployment</PageTitle>
        <p className="text-sm text-slate-500 mt-1">
          Docker Compose for local development · Kubernetes (Kustomize) for production
        </p>
      </div>

      <Tabs tabs={DEPLOY_TABS} active={tab} onChange={setTab} />

      <div className="pt-1">
        {tab === 'docker' && <DockerTab />}
        {tab === 'k8s'    && <KubernetesTab />}
      </div>
    </DocPageShell>
  )
}
