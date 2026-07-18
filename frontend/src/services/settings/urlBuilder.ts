import { BASE_PATH } from './settings.constant'

// Builds the module registry base path; appends /:id when provided.
export const urlBuilder = (id?: string): string => (id ? `/${BASE_PATH}/${id}` : `/${BASE_PATH}`)
