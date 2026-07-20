// Backend environment variables documented in docker-compose.yml.
export const DC_ENV = [
  { key: 'ADMIN_EMAIL',          default: 'admin@spin.local',                          description: 'Admin login email seeded on first run — change before deploying' },
  { key: 'ADMIN_PASSWORD',       default: 'change-me',                                 description: 'Admin password seeded on first run — change before deploying' },
  { key: 'ADMIN_NAME',           default: 'Admin',                                     description: 'Admin display name' },
  { key: 'JWT_SECRET_KEY',       default: 'change-me-in-production',                   description: 'JWT signing secret — change before deploying' },
  { key: 'SETTINGS_PATH',        default: '/app/data/settings.json',                   description: 'Path to settings file (theme only; modules live in Postgres)' },
  { key: 'SEED_PATH',            default: '/app/seed-data/seed.json',                  description: 'Path to first-run seed file (bots, modules, theme)' },
  { key: 'POSTGRES_URL',         default: 'postgresql://core-postgres:…@db:5432/…',    description: 'Primary DB connection string' },
  { key: 'CLICKHOUSE_URL',       default: 'clickhouse://core-ch:…@clickhouse:9000/…',  description: 'Event log DB connection string' },
  { key: 'OLLAMA_URL',           default: 'http://ollama:11434',                       description: 'Ollama API base URL (inside Docker network)' },
  { key: 'OLLAMA_MODEL',         default: 'qwen2.5:7b',                                description: 'Default LLM when no bot is selected or bot has no model set' },
  { key: 'ANTHROPIC_API_KEY',    default: '(empty)',                                    description: 'Required for bots with provider = "anthropic"' },
  { key: 'OPENAI_API_KEY',       default: '(empty)',                                    description: 'Required for bots with provider = "openai" (also Groq, Mistral, Azure)' },
  { key: 'OPENAI_BASE_URL',      default: '(empty)',                                    description: 'Override for OpenAI-compatible endpoints. Leave blank for api.openai.com' },
  { key: 'MODULE_REGISTRY_URLS', default: 'http://cloud-insight-ai:80,…',              description: 'Comma-separated base URLs scanned for manifest.json on discovery' },
]
