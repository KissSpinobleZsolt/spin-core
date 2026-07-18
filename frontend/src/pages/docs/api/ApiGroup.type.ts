import type { Endpoint } from './Endpoint.type' // endpoints belonging to this group

export interface ApiGroup {
  id: string         // anchor id used for scroll-spy navigation
  title: string      // display name shown in sidebar and card header
  note?: string      // optional context note shown under the card title
  endpoints: Endpoint[] // ordered list of endpoints in this group
}
