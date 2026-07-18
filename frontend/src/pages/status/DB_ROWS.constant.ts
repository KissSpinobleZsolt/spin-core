// Row definitions for the database status section
export const DB_ROWS: { key: 'postgres' | 'clickhouse'; icon: string; name: string; role: string }[] = [
  { key: 'postgres',   icon: '🐘', name: 'PostgreSQL',  role: 'Users & application data' },
  { key: 'clickhouse', icon: '🏠', name: 'ClickHouse',  role: 'Event logs & audit trail' },
]
