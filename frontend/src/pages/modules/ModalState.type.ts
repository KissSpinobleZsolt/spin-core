import type { ModuleConfig } from '@services'

// Discriminated union controlling which modal variant is open:
//   'add'               → open Add form with blank fields
//   ModuleConfig        → open Edit form pre-filled with the given module
//   { prefill: … }     → open Add form pre-filled from a discovered module
//   null               → modal closed
export type ModalState = 'add' | ModuleConfig | { prefill: Omit<ModuleConfig, 'id'> } | null
