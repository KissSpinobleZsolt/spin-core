import { GROUPS } from './GROUPS.constant' // source of truth for group ordering

export const IDS = GROUPS.map(g => g.id) // ordered list of section ids for scroll-spy
