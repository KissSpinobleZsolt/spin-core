import type { ComponentType } from 'react'
import React from 'react'
import ReactDOM from 'react-dom'
import type { FederationContainer } from './FederationContainer.type'

// Keyed by remoteEntry URL — stores the in-flight or already-resolved Promise.
// Sharing the same Promise across concurrent callers (e.g. React StrictMode
// double-invocation) ensures the second caller waits for the real onload event
// instead of resolving immediately against a script tag that is still loading.
const pendingScripts = new Map<string, Promise<void>>()

/** Inject a remote entry script into document.head, resolving when loaded. */
function injectScript(url: string): Promise<void> {
  if (pendingScripts.has(url)) {
    return pendingScripts.get(url)! // return same promise to any concurrent caller
  }
  const p = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.type = 'text/javascript'
    // async=false keeps document.currentScript set while remoteEntry.js runs so
    // webpack's publicPath: 'auto' detects the correct host (localhost:300x) rather
    // than the spin-core origin.  The load is still non-blocking — the Promise
    // only resolves after the script has executed.
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove() // remove stale tag so the next attempt injects a fresh one
      pendingScripts.delete(url) // allow retry after failure
      reject(new Error(`Failed to load remote entry: ${url}`))
    }
    document.head.appendChild(script)
  })
  pendingScripts.set(url, p)
  return p
}

/** Load a federated component from a Webpack Module Federation remote. */
export async function loadFederatedModule(
  remoteUrl: string,
  scope: string,
  component: string,
): Promise<ComponentType> {
  // Expose the host's React on window BEFORE the remote script loads.
  // Remotes declare react / react-dom as webpack externals ('React', 'ReactDOM')
  // so they read these globals instead of bundling their own copy — one React instance.
  window.React = React
  window.ReactDOM = ReactDOM

  await injectScript(remoteUrl) // deduplication via pendingScripts Map

  const container = window[scope] as FederationContainer | undefined
  if (!container) {
    throw new Error(`Federation scope "${scope}" not found after loading ${remoteUrl}`)
  }

  await container.init({})

  const factory = await container.get(component)
  const mod = factory()
  return mod.default
}
