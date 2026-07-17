// Kubernetes secrets sourced from k8s/.env via kustomize secretGenerator
export const K8S_SECRETS = [
  { key: 'JWT_SECRET_KEY',      description: 'JWT signing secret' },
  { key: 'ADMIN_EMAIL',         description: 'Admin login email seeded on first run' },
  { key: 'ADMIN_PASSWORD',      description: 'Admin password seeded on first run' },
  { key: 'ADMIN_NAME',          description: 'Admin display name' },
  { key: 'POSTGRES_USER',       description: 'PostgreSQL username' },
  { key: 'POSTGRES_PASSWORD',   description: 'PostgreSQL password' },
  { key: 'CLICKHOUSE_USER',     description: 'ClickHouse username' },
  { key: 'CLICKHOUSE_PASSWORD', description: 'ClickHouse password' },
  { key: 'ANTHROPIC_API_KEY',   description: 'Optional — enables Anthropic Claude models' },
  { key: 'OPENAI_API_KEY',      description: 'Optional — enables OpenAI-compatible models' },
]
