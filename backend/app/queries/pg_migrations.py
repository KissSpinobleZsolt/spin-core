# Idempotent ALTER TABLE statements applied at every startup to bring the schema
# up to date. Safe to run against an already-current schema.
PG_MIGRATION_STMTS: list[str] = [
    "ALTER TABLE translations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS restricted VARCHAR NOT NULL DEFAULT 'user'",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS modules VARCHAR[] NOT NULL DEFAULT '{}'",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS created_by VARCHAR DEFAULT ''",
    "ALTER TABLE bots DROP COLUMN IF EXISTS roles",
    # provider column: existing bots default to "ollama" so they keep working
    # without any manual data migration.
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS provider VARCHAR NOT NULL DEFAULT 'ollama'",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS backend_url VARCHAR",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS subscription VARCHAR NOT NULL DEFAULT ''",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS config_schema JSONB NOT NULL DEFAULT '{}'",
]
