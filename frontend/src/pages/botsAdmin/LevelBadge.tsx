import { Badge } from '@components/ui/badge' // badge component
import { LEVEL_VARIANT } from './LEVEL_VARIANT.constant' // level → variant map

export function LevelBadge({ level }: { level: string }) { // renders a coloured badge for a log level string
  return <Badge variant={LEVEL_VARIANT[level] ?? 'info'}>{level || 'INFO'}</Badge>
}
