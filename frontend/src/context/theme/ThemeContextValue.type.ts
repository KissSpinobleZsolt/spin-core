import type { Theme } from './Theme.type'

/** Shape of the value exposed by ThemeContext. */
export type ThemeContextValue = {
  theme: Theme
  setTheme(theme: Theme): void
}
