import type { SkeletonConfig } from './SkeletonConfig.type'

export interface PageConfig {
  id: string
  route: string
  title: string
  type: 'native' | 'federated'
  component_key: string | null
  remote_url: string | null
  scope: string | null
  component: string | null
  roles: string[]
  skeleton: SkeletonConfig
  enabled: boolean
}
