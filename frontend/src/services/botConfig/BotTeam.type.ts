/** A named group of entities that share the same trading role within a bot. */
export interface BotTeam {
  id: string
  name: string
  description: string
  role: string | null
}
