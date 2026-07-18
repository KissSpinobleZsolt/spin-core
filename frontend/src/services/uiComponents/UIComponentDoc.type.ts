import type { UIComponentProp } from './UIComponentProp.type'

export interface UIComponentDoc {
  id: string
  name: string
  export: string
  file: string
  description: string
  props: UIComponentProp[]
  notes: string | null
  sort_order: number
}
