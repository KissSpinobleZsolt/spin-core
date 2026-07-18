/** Preset configuration buckets injected into a federated module as props. */
export interface ModulePresets {
  /** Locale key-value overrides passed to the module's i18n layer. */
  i18n: Record<string, unknown>
  /** Layout hints passed to the module's layout system. */
  layout: Record<string, unknown>
  /** Arbitrary module-specific settings key-value pairs. */
  settings: Record<string, unknown>
}
