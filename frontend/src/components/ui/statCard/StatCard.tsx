import type { StatCardProps } from './StatCardProps.type'
import './StatCard.style.css'

export function StatCard({ value, label, sub, className }: StatCardProps) {
  return (
    <div className={`stat-card${className ? ` ${className}` : ''}`}>
      <p className="stat-card__value">{value}</p>
      <p className="stat-card__label">{label}</p>
      {sub && <p className="stat-card__sub">{sub}</p>}
    </div>
  )
}
