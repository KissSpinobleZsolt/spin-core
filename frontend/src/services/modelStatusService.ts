export type InstalledModel = {
  name: string
  size_bytes: number | null
  modified_at?: string | null
  family: string | null
  parameter_size: string | null
  quantization?: string | null
  format?: string | null
}

export type InstalledModelsData = {
  ollama: 'ok' | 'unreachable'
  models: InstalledModel[]
}
