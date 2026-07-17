/** Maps module ID → whether the module's remote is reachable. Absent key means not yet probed. */
export type ReachabilityMap = Record<string, boolean>
