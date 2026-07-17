import type { ComponentType } from 'react'
import type * as React from 'react'
import type * as ReactDOM from 'react-dom'

/** Webpack Module Federation container exposed by a remote entry script. */
export interface FederationContainer {
  init(shareScope: object): Promise<void>
  get(module: string): Promise<() => { default: ComponentType }>
}

// Augment Window so TypeScript accepts dynamic scope lookups (window[scope]).
declare global {
  interface Window {
    [key: string]: FederationContainer | undefined
    React: typeof React
    ReactDOM: typeof ReactDOM
  }
}
