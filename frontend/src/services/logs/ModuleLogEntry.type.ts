/** Single event log entry emitted by a module. */
export interface ModuleLogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  message: string
  name: string
  details: string
}
