import type { SkeletonConfig } from '@services'
import { TableSkeleton } from './TableSkeleton'
import { CardsSkeleton } from './CardsSkeleton'
import { DocSkeleton } from './DocSkeleton'

export function PageSkeletonLoader({ config }: { config?: SkeletonConfig }) {
  if (!config) {
    return <TableSkeleton /> // Default to table skeleton when no config is provided
  }
  if (config.type === 'cards') {
    return <CardsSkeleton columns={config.columns} rows={config.rows} />
  }
  if (config.type === 'doc') {
    return <DocSkeleton rows={config.rows} />
  }
  return <TableSkeleton columns={config.columns} rows={config.rows} />
}
