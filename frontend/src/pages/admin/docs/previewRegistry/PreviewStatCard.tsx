import { StatCard } from '../../../../components/ui/statCard' // KPI metric card

// Shows two StatCard instances in a two-column grid.
export function PreviewStatCard() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard value="1,284" label="Total Records" sub="across all sources" />
      <StatCard value="99.8%" label="Uptime" sub="last 30 days" />
    </div>
  )
}
