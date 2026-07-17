import { Card } from '../../../../components/ui/Card' // white/dark rounded container

// Demonstrates the Card container with sample body text.
export function PreviewCard() {
  return (
    <Card>
      <p className="text-sm text-slate-600 dark:text-slate-300">White / dark rounded container with p-6 padding and a border.</p>
    </Card>
  )
}
