import type { ModuleConfig } from '@services'
import type { ReachabilityMap } from './ReachabilityMap.type'

/** Shape of the value exposed by SettingsContext. */
export interface SettingsContextValue {
  modules: ModuleConfig[]
  /** module ID → true/false; absent means not yet probed */
  moduleReachability: ReachabilityMap
  refreshModules: () => Promise<void>
}
