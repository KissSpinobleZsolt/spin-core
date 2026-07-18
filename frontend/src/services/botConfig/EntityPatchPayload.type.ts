/** Partial update fields allowed when patching an existing entity. */
export interface EntityPatchPayload {
  display_name?: string
  exchange?: string
  active?: boolean
}
