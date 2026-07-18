import { Badge } from '@components/ui/badge' // coloured badge
import { LEVEL_VARIANT } from './LEVEL_VARIANT.constant' // level → variant map

export function LevelBadge({ level }: { level: string }) { // renders a coloured log-level badge
  return <Badge variant={LEVEL_VARIANT[level] ?? 'info'}>{level || 'INFO'}</Badge>
}
