import type { InstalledModel } from './InstalledModel.type'

/** Ollama reachability status together with the list of installed models. */
export type InstalledModelsData = {
  ollama: 'ok' | 'unreachable'
  models: InstalledModel[]
}
