// Docker Compose service definitions shown in the Services & Ports table
export const DC_SERVICES = [
  { name: 'postgres',                     port: '5432',       image: 'postgres:16-alpine',                description: 'Primary DB — users, bots, modules, i18n, module data' },
  { name: 'clickhouse',                   port: '8123, 9000', image: 'clickhouse/clickhouse-server:24',   description: 'Event log DB — app_logs, module logs, chat logs, MVs' },
  { name: 'ollama',                       port: '11434',      image: 'ollama/ollama',                     description: 'Self-hosted LLM server — GPU-accelerated, 24 h keep-alive' },
  { name: 'model-downloader',             port: '—',          image: 'ollama/ollama',                     description: 'One-shot: pulls qwen2.5:7b + nomic-embed-text on first start' },
  { name: 'backend',                      port: '8000',       image: 'build ./backend',                   description: 'FastAPI core — REST API, auth, streaming chat, plugin proxy' },
  { name: 'frontend',                     port: '3000',       image: 'build ./frontend',                  description: 'React 19 SPA (production Nginx build)' },
  { name: 'frontend-dev',                 port: '3000',       image: 'build ./frontend (dev)',             description: 'Vite dev server with HMR — activated via --profile dev' },
  { name: 'spin-docs',                    port: '3001',       image: 'build ./modules/spin-docs',         description: 'Architecture diagrams + dev docs (system role)' },
  { name: 'cloud-insight-ai',             port: '3002',       image: 'build ./modules/cloud-insight-ai',  description: 'Data Ingestion MF remote' },
  { name: 'cloud-insight-ai-backend',     port: '8002',       image: 'build (module backend)',            description: 'Data Ingestion FastAPI backend' },
  { name: 'anomascan',                    port: '3003',       image: 'build ./modules/AnomaScan',         description: 'Vision Watch MF remote' },
  { name: 'anomascan-backend',            port: '8003',       image: 'build (module backend)',            description: 'Vision Watch backend — PyTorch + YOLO' },
  { name: 'bots-trader-platform',         port: '3004',       image: 'build (module)',                    description: 'Trading Platform MF remote' },
  { name: 'bots-trader-platform-backend', port: '8004',       image: 'build (module backend)',            description: 'Trading Platform backend' },
]
