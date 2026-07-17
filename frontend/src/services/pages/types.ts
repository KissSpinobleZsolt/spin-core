export interface SkeletonConfig {
  type: 'table' | 'cards' | 'doc'
  columns?: number
  rows?: number
}

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
