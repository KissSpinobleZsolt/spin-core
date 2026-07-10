import type { ComponentType } from 'react'
import * as React from 'react'
import * as ReactDOM from 'react-dom'

declare global {
  interface Window {
    [key: string]: FederationContainer | undefined
    React: typeof React
    ReactDOM: typeof ReactDOM
  }
}

interface FederationContainer {
  init(shareScope: object): Promise<void>
  get(module: string): Promise<() => { default: ComponentType }>
}

const loadedScripts = new Set<string>()

function injectScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = url
    script.type = 'text/javascript'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load remote entry: ${url}`))
    document.head.appendChild(script)
  })
}

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

  if (!loadedScripts.has(scope)) {
    await injectScript(remoteUrl)
    loadedScripts.add(scope)
  }

  const container = window[scope] as FederationContainer | undefined
  if (!container) {
    throw new Error(`Federation scope "${scope}" not found after loading ${remoteUrl}`)
  }

  await container.init({})

  const factory = await container.get(component)
  const mod = factory()
  return mod.default
}
