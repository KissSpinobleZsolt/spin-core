# Idempotent ALTER TABLE statements applied at every startup to bring the schema
# up to date. Safe to run against an already-current schema.
#
# Rules:
#   ADD COLUMN  — always use IF NOT EXISTS.
#   DROP COLUMN — always use IF EXISTS.
PG_MIGRATION_STMTS: list[str] = [
    # ── pre-audit legacy columns ───────────────────────────────────────────────
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS restricted VARCHAR NOT NULL DEFAULT 'user'",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS modules VARCHAR[] NOT NULL DEFAULT '{}'",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS created_by VARCHAR DEFAULT ''",
    "ALTER TABLE bots DROP COLUMN IF EXISTS roles",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS provider VARCHAR NOT NULL DEFAULT 'ollama'",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS backend_url VARCHAR",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS subscription VARCHAR NOT NULL DEFAULT ''",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS config_schema JSONB NOT NULL DEFAULT '{}'",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS configuration_raw JSONB",

    # ── audit columns: bots ───────────────────────────────────────────────────
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS owner VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS updated_by VARCHAR",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS created_on TIMESTAMP DEFAULT now()",
    "ALTER TABLE bots ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP",

    # ── audit columns: modules ────────────────────────────────────────────────
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS owner VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS updated_by VARCHAR",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS created_on TIMESTAMP DEFAULT now()",
    "ALTER TABLE modules ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP",

    # ── audit columns: users ──────────────────────────────────────────────────
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS owner VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_on TIMESTAMP DEFAULT now()",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP",

    # ── audit columns: translations ───────────────────────────────────────────
    "ALTER TABLE translations ADD COLUMN IF NOT EXISTS owner VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE translations ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE translations ADD COLUMN IF NOT EXISTS updated_by VARCHAR",
    "ALTER TABLE translations ADD COLUMN IF NOT EXISTS created_on TIMESTAMP DEFAULT now()",
    "ALTER TABLE translations ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP",

    # ── audit columns: bot_types ──────────────────────────────────────────────
    "ALTER TABLE bot_types ADD COLUMN IF NOT EXISTS owner VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE bot_types ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE bot_types ADD COLUMN IF NOT EXISTS updated_by VARCHAR",
    "ALTER TABLE bot_types ADD COLUMN IF NOT EXISTS created_on TIMESTAMP DEFAULT now()",
    "ALTER TABLE bot_types ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP",

    # ── audit columns: module_documents ──────────────────────────────────────
    "ALTER TABLE module_documents ADD COLUMN IF NOT EXISTS owner VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE module_documents ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE module_documents ADD COLUMN IF NOT EXISTS updated_by VARCHAR",
    "ALTER TABLE module_documents ADD COLUMN IF NOT EXISTS created_on TIMESTAMP DEFAULT now()",
    "ALTER TABLE module_documents ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP",

    # ── audit columns: page_responses ─────────────────────────────────────────
    "ALTER TABLE page_responses ADD COLUMN IF NOT EXISTS owner VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE page_responses ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE page_responses ADD COLUMN IF NOT EXISTS updated_by VARCHAR",
    "ALTER TABLE page_responses ADD COLUMN IF NOT EXISTS created_on TIMESTAMP DEFAULT now()",
    "ALTER TABLE page_responses ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP",

    # ── audit columns: page_registry ──────────────────────────────────────────
    "ALTER TABLE page_registry ADD COLUMN IF NOT EXISTS owner VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE page_registry ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT 'system'",
    "ALTER TABLE page_registry ADD COLUMN IF NOT EXISTS updated_by VARCHAR",
    "ALTER TABLE page_registry ADD COLUMN IF NOT EXISTS created_on TIMESTAMP DEFAULT now()",
    "ALTER TABLE page_registry ADD COLUMN IF NOT EXISTS updated_on TIMESTAMP",
]
