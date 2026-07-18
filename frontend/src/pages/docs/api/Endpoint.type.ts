import type { Method } from './Method.type' // HTTP method for this endpoint
import type { Auth } from './Auth.type' // auth requirement for this endpoint

export interface Endpoint {
  method: Method // HTTP verb
  path: string   // route pattern e.g. /api/bots/{id}
  auth: Auth     // who can call it
  description: string // one-line summary of what the endpoint does
}
