import { Badge } from '../../../components/ui/badge'
import { LEVEL_VARIANT } from './LEVEL_VARIANT.constant'

// Renders a coloured Badge for a log level string; falls back to 'info' for unknown levels
export function LevelBadge({ level }: { level: string }) {
  return <Badge variant={LEVEL_VARIANT[level] ?? 'info'}>{level || 'INFO'}</Badge>
}
