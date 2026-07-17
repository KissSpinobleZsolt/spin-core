import { Badge } from '../../../../components/ui/badge' // coloured status badge

// Shows all Badge variants and the optional dot indicator.
export function PreviewBadge() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warn">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="success" dot>With dot</Badge> {/* dot indicator alongside text */}
      <Badge variant="error" dot>Critical</Badge>
    </div>
  )
}
