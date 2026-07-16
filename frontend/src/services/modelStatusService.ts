/** @module services/modelStatus — Ollama model installation status types. */

/** Metadata for a model currently installed in Ollama. */
export type InstalledModel = {
  name: string
  size_bytes: number | null
  modified_at?: string | null
  family: string | null
  parameter_size: string | null
  quantization?: string | null
  format?: string | null
}

/** Ollama reachability status together with the list of installed models. */
export type InstalledModelsData = {
  ollama: 'ok' | 'unreachable'
  models: InstalledModel[]
}
