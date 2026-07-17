import { Btn } from '../../../../components/ui/button' // primary UI button

// Shows primary, secondary, danger, and disabled button variants side by side.
export function PreviewButton() {
  return (
    <div className="flex flex-wrap gap-3">
      <Btn variant="primary">Primary</Btn>
      <Btn variant="secondary">Secondary</Btn>
      <Btn variant="danger">Danger</Btn>
      <Btn variant="primary" disabled>Disabled</Btn> {/* disabled state demo */}
    </div>
  )
}
