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
