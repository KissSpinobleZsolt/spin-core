export interface UIComponentProp {
  name: string
  type: string
  default?: string
  required: boolean
  description: string
}

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
