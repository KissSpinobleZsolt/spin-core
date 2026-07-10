import type { ComponentType } from 'react'

declare global {
  interface Window {
    [key: string]: FederationContainer | undefined
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
  if (!loadedScripts.has(scope)) {
    await injectScript(remoteUrl)
    loadedScripts.add(scope)
  }

  const container = window[scope] as FederationContainer | undefined
  if (!container) {
    throw new Error(`Federation scope "${scope}" not found after loading ${remoteUrl}`)
  }

  // Pass an empty share scope — each remote is self-contained with its own deps
  await container.init({})

  const factory = await container.get(component)
  const mod = factory()
  return mod.default
}
