import type { ModuleConfig } from '@services'

/** HEAD-checks a module's manifest.json to detect whether its remote container is reachable. */
export async function probeModule(m: ModuleConfig): Promise<boolean> {
  if (!m.remote_url) return true // Built-in modules (e.g. system/dashboard) are always reachable
  try {
    const base = m.remote_url.replace(/\/remoteEntry\.js$/, '').replace(/\/$/, '')
    const resp = await fetch(`${base}/manifest.json`, {
      method: 'HEAD',
      // 3 s is enough to distinguish "container down" from "slow network"
      signal: AbortSignal.timeout(3000),
    })
    return resp.ok
  } catch {
    return false
  }
}
