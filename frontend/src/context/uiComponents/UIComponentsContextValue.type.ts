import type { UIComponentDoc } from '@services'

/** Shape of the value exposed by UIComponentsContext. */
export interface UIComponentsContextValue {
  components: UIComponentDoc[]
  loading: boolean
  error: string | null
}
